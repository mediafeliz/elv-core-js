import "@babel/polyfill";
import "./static/stylesheets/defaults.scss";

import React from "react";
import { render } from "react-dom";
import { Route, Switch, HashRouter } from "react-router-dom";
import { Redirect } from "react-router";

import * as Stores from "./stores";
import {inject, observer, Provider} from "mobx-react";

import {Action, ErrorHandler, LoadingElement} from "elv-components-js";

import EnforceLogin from "./EnforceLogin";

import Header from "./components/Header";
import Navigation from "./components/Navigation";

import {AppRoutes, SiteRoutes} from "./Routes";

@inject("root")
@inject("accounts")
@observer
class App extends React.PureComponent {
  render() {
    if(this.props.root.configError) {
      return (
        <div className="page-error">
          <div className="page-error-container">
            <h1>
              Unable to load client configuration
            </h1>
            <h1>
              {EluvioConfiguration["config-url"]}
            </h1>

            <Action onClick={() => this.props.root.InitializeClient()}>
              Retry
            </Action>
          </div>
        </div>
      );
    }

    return (
      <HashRouter>
        <LoadingElement
          loading={!this.props.root.client || !this.props.accounts.accountsLoaded}
          fullPage={true}
          render={() => (
            <div className="router-container">
              <Header />
              <Navigation />
              <EnforceLogin key={`app-${this.props.accounts.currentAccountAddress}`}>
                <Switch>
                  {
                    SiteRoutes.map(({path, component}) =>
                      <Route key={`route-${path}`} exact path={path} component={component}/>
                    )
                  }

                  {
                    AppRoutes.map(({path, component}) =>
                      <Route key={`route-${path}`} exact path={path} component={component}/>
                    )
                  }

                  <Route>
                    <Redirect to="/accounts"/>
                  </Route>
                </Switch>
              </EnforceLogin>
            </div>
          )}
        />
      </HashRouter>
    );
  }
}

const AppComponent = ErrorHandler(App);

render(
  (
    <React.Fragment>
      <Provider {...Stores}>
        <AppComponent />
      </Provider>
      <div className="app-version">{EluvioConfiguration.version}</div>
    </React.Fragment>
  ),
  document.getElementById("app")
);
