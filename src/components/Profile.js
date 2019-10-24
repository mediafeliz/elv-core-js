import "../static/stylesheets/profile.scss";

import React from "react";
import {
  Balance,
  Confirm,
  CroppedIconWithAction,
  IconButton,
  BallClipRotate,
  onEnterPressed,
  TraversableJson
} from "elv-components-js";

import DefaultProfileImage from "../static/icons/User.svg";
import UrlJoin from "url-join";

import XIcon from "../static/icons/X.svg";
import KeyIcon from "../static/icons/Key.svg";
import {inject, observer} from "mobx-react";

@inject("accounts")
@inject("profiles")
@observer
class Profile extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      browseRef: React.createRef(),
      newName: "",
      updating: false,
      showKey: false
    };

    this.HandleProfileImageChange = this.HandleProfileImageChange.bind(this);
    this.HandleNameChange = this.HandleNameChange.bind(this);
    this.HandleAccessLevelChange = this.HandleAccessLevelChange.bind(this);
    this.RevokeAccessor = this.RevokeAccessor.bind(this);
  }

  async componentDidMount() {
    await this.props.profiles.UserMetadata();
  }

  Update(fn) {
    if(this.state.updating) { return; }

    this.setState({updating: true});

    fn()
      .then(() => this.setState({updating: false}))
      .catch((error) => this.setState({updating: false, error}));
  }

  HandleNameChange() {
    const profile = this.props.profiles.currentProfile;

    if(this.state.newName === profile.metadata.public.name) {
      this.setState({modifyingName: false});

      return;
    }

    this.Update(async () => {
      await this.props.profiles.ReplaceUserMetadata({
        metadataSubtree: UrlJoin("public", "name"),
        metadata: this.state.newName
      });

      this.setState({
        modifyingName: false
      });
    });
  }

  async HandleProfileImageChange(event) {
    this.Update(async () =>
      await this.props.profiles.ReplaceUserProfileImage(event.target.files[0])
    );
  }

  async HandleAccessLevelChange(event) {
    this.Update(async () =>
      await this.props.profiles.ReplaceUserMetadata({
        metadataSubtree: "access_level",
        metadata: event.target.value
      })
    );
  }

  async RevokeAccessor(accessor) {
    await Confirm({
      message: <span>Are you sure you want to revoke profile access from <b>{accessor}</b>?</span>,
      onConfirm: async () => await this.props.profiles.DeleteUserMetadata({metadataSubtree: UrlJoin("allowed_accessors", accessor)})
    });
  }

  Permissions(metadata) {
    const permissionSelection = (
      <select value={metadata.access_level || "prompt"} name="access_level" aria-label="Access Level" onChange={this.HandleAccessLevelChange}>
        <option value="public">Public Access</option>
        <option value="prompt">Prompt</option>
        <option value="private">Private</option>
      </select>
    );

    let allowedAccessors = Object.keys(metadata.allowed_accessors || {})
      .sort((a, b) => metadata.allowed_accessors[a] > metadata.allowed_accessors[b] ? -1 : 1);

    return (
      <div>
        <div className="info-section">
          <h4>Permissions</h4>
          <h5 className="subheader">Here you can specify whether applications can request access to your personal information</h5>
          { permissionSelection }
        </div>
        <div className="info-section">
          <h4>Applications</h4>
          <h5 className="subheader">The following applications have access to your private profile</h5>
          <div className="indented application-permissions">
            {allowedAccessors.map(accessor =>
              <div className="labelled-field application-permission" key={"accessor-row-" + accessor}>
                <label>{accessor}</label>
                <IconButton
                  icon={XIcon}
                  label={`Revoke profile access from ${accessor}`}
                  onClick={() => this.RevokeAccessor(accessor)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  CollectedTags(tags) {
    if(!tags) { return null; }

    let sortedTags = Object.keys(tags)
      .map(tag => { return {tag, ...tags[tag]}; })
      .sort((a, b) => a.aggregate < b.aggregate ? 1 : -1)
      .map(tag => {
        return (
          <tr key={`tag-row-${tag.tag}`}>
            <td>{tag.tag}</td>
            <td>{tag.aggregate.toFixed(2)}</td>
            <td>{tag.occurrences}</td>
          </tr>
        );
      });


    return (
      <div className="info-section">
        <h4>Tags based on viewing history</h4>
        <div className="">
          <table>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Aggregate Score</th>
                <th>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {sortedTags}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  PrivateKey(signer) {
    return (
      <span className="private-key-container">
        <IconButton icon={KeyIcon} label={`${this.state.showKey ? "Hide" : "Show"} Private Key`} onClick={() => this.setState({showKey: !this.state.showKey})}/>
        <span className={`private-key ${this.state.showKey ? "visible" : ""}`}>
          { this.state.showKey ? signer.privateKey : "" }
        </span>
      </span>
    );
  }

  ProfileImage(imageUrl) {
    const updateIndicator = this.state.updating ? <div className="update-indicator"><BallClipRotate /></div> : undefined;

    return (
      <div className="profile-image-container-container">
        <div className="profile-image-container">
          {updateIndicator}
          <CroppedIconWithAction
            icon={imageUrl}
            alternateIcon={DefaultProfileImage}
            useLoadingIndicator={true}
            label="Profile Image"
            actionText="Set Profile Image"
            onClick={() => this.state.browseRef.current.click()}
            className="profile-image"
          >
            <input ref={this.state.browseRef} type="file" multiple={false} accept="image/*" hidden={true} onChange={this.HandleProfileImageChange}/>
          </CroppedIconWithAction>
        </div>
      </div>
    );
  }

  Name(name) {
    if(this.state.modifyingName) {
      return (
        <div className="modifiable-field modifying">
          <div className="modifiable-field-input">
            <input
              autoFocus
              placeholder="Name"
              value={this.state.newName}
              onChange={(event) => this.setState({newName: event.target.value})}
              onKeyPress={onEnterPressed(this.HandleNameChange)}
              onBlur={this.HandleNameChange}
            />
            <IconButton icon={XIcon} label="Cancel" className="cancel-button" onClick={() => this.setState({modifyingName: false})}/>
          </div>
        </div>
      );
    } else {
      const StartEditing = () => this.setState({modifyingName: true, newName: name || ""});
      return (
        <div className="modifiable-field">
          <h3 tabIndex={0} className="page-header modifiable-field" onClick={StartEditing} onKeyPress={StartEditing}>
            {name || "Account Name"}
          </h3>
        </div>
      );
    }
  }

  ErrorMessage() {
    if(!this.state.error) { return; }

    return (
      <span>
        {this.state.error.message}
        <IconButton icon={XIcon} label="Clear" className="clear-button" onClick={() => this.setState({error: undefined})}/>
      </span>
    );
  }

  render() {
    const account = this.props.accounts.currentAccount;
    const profile = this.props.profiles.currentProfile;
    const collectedTags = this.CollectedTags(profile.metadata.collected_data);
    const permissions = this.Permissions(profile.metadata);

    return (
      <div className="page-content">
        <div className="profile">
          <div className="error-message">{this.ErrorMessage()}</div>
          { this.ProfileImage(profile.imageUrl) }
          <div className="profile-info">
            <div className="user-info">
              { this.Name(profile.metadata.public.name) }
              <div className="page-subheader">
                { account.address }
              </div>
              <div className="page-subheader">
                <Balance balance={account.balance} className="account-balance" />
              </div>
              { this.PrivateKey(account.signer) }
            </div>
            <div className="info-section">
              <h4>Profile Information</h4>
              <div className="indented">
                <TraversableJson json={profile.metadata} />
              </div>
            </div>
            { permissions }
            { collectedTags }
          </div>
        </div>
      </div>
    );
  }
}

export default Profile;

