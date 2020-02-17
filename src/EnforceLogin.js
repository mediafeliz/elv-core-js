import React from "react";
import {Redirect, withRouter} from "react-router";
import LoginModal from "./components/LoginModal";
import {inject, observer} from "mobx-react";
import {LoadingElement} from "elv-components-js";
import {AppRoutes} from "./Routes";

@inject("accounts")
@inject("root")
@observer
class EnforceLogin extends React.PureComponent {
  render() {
    const currentAccount = this.props.accounts.currentAccount;

    const accountRequired =
      !!AppRoutes.find(({path}) => path === this.props.location.pathname) &&
      !this.props.location.pathname.startsWith("/accounts");

    if(!accountRequired) {
      return this.props.children;
    } else if(!currentAccount || currentAccount.balance < 0.1) {
      return <Redirect to="/accounts"/>;
    } else if(!currentAccount.signer) {
      return (
        <LoginModal
          prompt={true}
          address={currentAccount.address}
          Submit={
            async (password) => await this.props.accounts.UnlockAccount({
              address: currentAccount.address,
              password
            })
          }
        />
      );
    } else {
      return (
        <LoadingElement
          loading={!this.props.root.signerSet}
          fullPage={true}
        >
          { this.props.children }
        </LoadingElement>
      );
    }
  }
}

export default withRouter(EnforceLogin);
