import React from "react";
import {Form} from "elv-components-js";
import {Action} from "elv-components-js";
import {RadioSelect} from "elv-components-js";
import {inject, observer} from "mobx-react";

@inject("accounts")
@observer
class AccountForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      credentialType: "privateKey",
      privateKey: "",
      encryptedPrivateKey: "",
      mnemonic: "",
      password: ""
    };

    this.HandleSubmit = this.HandleSubmit.bind(this);
    this.HandleInputChange = this.HandleInputChange.bind(this);
  }

  HandleInputChange(event) {
    this.setState({
      [event.target.name]: event.target.value
    });

    if(event.target.name === "credentialType") {
      this.setState({
        privateKey: "",
        encryptedPrivateKey: "",
        mnemonic: ""
      });
    }
  }

  async HandleSubmit() {
    await this.props.accounts.AddAccount({
      privateKey: this.state.privateKey,
      encryptedPrivateKey: this.state.encryptedPrivateKey,
      mnemonic: this.state.mnemonic,
      password: this.state.password
    });
  }

  Credentials() {
    switch (this.state.credentialType) {
      case "privateKey":
        return [
          <label key="credential-label" htmlFor="privateKey">Private Key</label>,
          <input
            key="credential-input"
            name="privateKey"
            value={this.state.privateKey}
            onChange={this.HandleInputChange}
          />
        ];
      case "encryptedPrivateKey":
        return [
          <label key="credential-label" className="align-top" htmlFor="encryptedPrivateKey">Encrypted Private Key</label>,
          <textarea
            key="credential-input"
            name="encryptedPrivateKey"
            value={this.state.encryptedPrivateKey}
            onChange={this.HandleInputChange}
          />
        ];
      case "mnemonic":
        return [
          <label key="generate-mnemonic-label" htmlFor="generateMnemonic">Generate Mnemonic</label>,
          <div key="generate-mnemonic-button" className="actions-container">
            <Action onClick={() => this.setState({mnemonic: this.props.accounts.GenerateMnemonic()})}>
              Generate Mnemonic
            </Action>
          </div>,
          <label key="credential-label" className="align-top" htmlFor="encryptedPrivateKey">Mnemonic</label>,
          <textarea
            key="credential-input"
            className="mnemonic-input"
            name="mnemonic"
            value={this.state.mnemonic}
            onChange={this.HandleInputChange}
          />
        ];
    }

    return null;
  }

  render() {
    return (
      <div className="page-content">
        <Form
          legend="Add Account"
          OnSubmit={this.HandleSubmit}
          redirectPath="/accounts"
          cancelPath="/accounts"
        >
          <div className="form-content">
            <label htmlFor="credentialType">Credential Type</label>
            <RadioSelect
              name="credentialType"
              label="Credential Type"
              inline={true}
              options={
                [
                  ["Private Key", "privateKey"],
                  ["Encrypted Private Key", "encryptedPrivateKey"],
                  ["Mnemonic", "mnemonic"]
                ]
              }
              selected={this.state.credentialType}
              onChange={this.HandleInputChange}
            />

            { this.Credentials() }

            <label htmlFor="password">Password</label>
            <input name="password" type="password" value={this.state.password} required={true} onChange={this.HandleInputChange} />
          </div>
        </Form>
      </div>
    );
  }
}

export default AccountForm;
