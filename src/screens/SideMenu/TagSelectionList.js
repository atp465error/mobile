import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Sync from '@SFJS/syncManager'
import ItemActionManager from '@Lib/itemActionManager'
import ModelManager from '@SFJS/modelManager'
import Auth from "@SFJS/authManager"

import StyleKit from "@Style/StyleKit"
import SideMenuCell from "@SideMenu/SideMenuCell"

import ThemedComponent from "@Components/ThemedComponent";

import ApplicationState from "@Lib/ApplicationState"
import OptionsState from "@Lib/OptionsState"
import ActionSheetWrapper from "@Style/ActionSheetWrapper"

import { withNavigation } from 'react-navigation';

class TagSelectionList extends ThemedComponent {

  /*
    @param props.selectedTags
    @param props.onTagSelect
  */

  constructor(props) {
    super(props);
    this.state = {tags: []};
  }

  componentDidMount() {
    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;
      this.reload();
    }

    this.reload();

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.reload();
      }
    });

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }

      else if(event == "sync:completed") {
        let inRetrieved = data.retrievedItems && _.find(data.retrievedItems, {content_type: this.props.contentType});
        let inSaved = data.savedItems && _.find(data.savedItems, {content_type: this.props.contentType});
        if(inRetrieved || inSaved) {
          this.reload();
        }
      }
    })
  }

  componentWillUnmount() {
    Sync.get().removeEventHandler(this.syncEventHandler);
    Auth.get().removeEventHandler(this.signoutObserver);
  }

  reload = () => {
    let tags;
    if(this.props.contentType == "Tag") {
      tags = ModelManager.get().tags.slice();
    } else {
      tags = ModelManager.get().getSmartTags();
    }
    this.setState({tags: tags});
  }

  /*
  Tag Options
  */

  onTagSelect = (tag) => {
    this.props.onTagSelect(tag);
  }

  showActionSheet = (tag) => {
    let sheet = new ActionSheetWrapper({
      title: tag.title,
      options: [
        ActionSheetWrapper.BuildOption({text: "Rename", callback: () => {
          this.props.navigation.navigate("InputModal", {
            title: 'Rename Tag',
            placeholder: "Tag name",
            initialValue: tag.title,
            onSubmit: (text) => {
              if(tag) {
                tag.title = text; // Update the text on the tag to the input text
                tag.setDirty(true);
                Sync.get().sync();
                this.forceUpdate();
              }
            }
          })
        }}),
        ActionSheetWrapper.BuildOption({text: "Delete", destructive: true, callback: () => {
          ItemActionManager.handleEvent(ItemActionManager.DeleteEvent, tag, () => {
            this.reload();
          });
        }})
      ], onCancel: () => {
        this.setState({actionSheet: null});
      }
    });

    this.setState({actionSheet: sheet.actionSheetElement()});
    sheet.show();
  }

  iconDescriptorForTag = (tag) => {
    return {
      type: "ascii",
      value: "#"
    };
  }

  // must pass title, text, and tags as props so that it re-renders when either of those change
  renderTagCell = ({item}) => {
    return (
      <View>
        <SideMenuCell
          onSelect={() => {this.onTagSelect(item)}}
          onLongPress={() => this.showActionSheet(item)}
          text={item.deleted ? "Deleting..." : item.title}
          iconDesc={this.iconDescriptorForTag(item)}
          key={item.uuid}
          selected={this.props.selectedTags.includes(item)}
        />
      </View>
    )
  }

  render() {
    return (
      <Fragment>
        <FlatList
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={this.state.tags}
          renderItem={this.renderTagCell}
          extraData={this.props.selectedTags /* Required to force list cells to update on selection change */}
        />

        {this.state.tags.length == 0 &&
          <Text style={this.styles.emptyPlaceholderText}>{this.props.emptyPlaceholder}</Text>
        }

        {this.state.actionSheet && this.state.actionSheet}
      </Fragment>
    )
  }

  loadStyles() {
    this.styles = {
      emptyPlaceholderText: {
        color: StyleKit.variables.stylekitForegroundColor,
        opacity: 0.6,
        paddingRight: 30,
        lineHeight: 18
      }
    }
  }
}

export default withNavigation(TagSelectionList);
