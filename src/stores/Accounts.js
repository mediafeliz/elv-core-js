import {action, computed, flow, observable} from "mobx";

class AccountStore {
  @observable accounts = {};
  @observable currentAccountAddress;
  @observable accountsLoaded = false;

  @computed get currentAccount() {
    return this.currentAccountAddress ? this.accounts[this.currentAccountAddress] : undefined;
  }

  @computed get sortedAccounts() {
    return Object.keys(this.accounts)
      .map(address => [address, this.rootStore.profilesStore.profiles[address].metadata.public.name])
      .sort(([addressA, nameA], [addressB, nameB]) => {
        if(nameA && nameB) {
          return nameA.toLowerCase() < nameB.toLowerCase() ? -1 : 1;
        } else if(nameA) {
          return -1;
        } else if(nameB) {
          return 1;
        } else {
          return addressA.toLowerCase() < addressB.toLowerCase() ? -1 : 1;
        }
      })
      .map(([address]) => address);
  }

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  @action.bound
  LoadAccounts = flow(function * () {
    let accounts = localStorage.getItem("elv-accounts");

    this.accounts = accounts ? JSON.parse(atob(accounts)) : {};

    this.currentAccountAddress = localStorage.getItem("elv-current-account");

    yield Promise.all(
      Object.keys(this.accounts).map(async address => {
        await this.GetAccountBalance(address);
        await this.rootStore.profilesStore.UpdatePublicMetadata(address);
      })
    );

    this.accountsLoaded = true;
  });

  @action.bound
  GetAccountBalance = flow(function * (address) {
    const client = this.rootStore.client;

    address = client.utils.FormatAddress(address);

    if(!(Object.keys(this.accounts).includes(address))) {
      return;
    }

    this.accounts[address].balance = client.utils.ToBigNumber(
      yield client.GetBalance({address})
    ).toFixed(3);
  });

  @action.bound
  UnlockAccount = flow(function * ({address, password}) {
    const client = this.rootStore.client;
    address = client.utils.FormatAddress(address);

    const account = this.accounts[address];

    if(!account) { throw Error(`Unknown account: ${address}`); }

    if(!account.signer) {
      const wallet = client.GenerateWallet();
      this.accounts[address].signer = yield wallet.AddAccountFromEncryptedPK({
        encryptedPrivateKey: account.encryptedPrivateKey,
        password
      });
    }

    this.rootStore.InitializeClient(this.accounts[address].signer);

    yield this.GetAccountBalance(address);

    this.SetCurrentAccount({signer: this.accounts[address].signer});
  });

  SendFunds = flow(function * ({recipient, ether}) {
    recipient = this.rootStore.client.utils.FormatAddress(recipient);

    yield this.rootStore.client.SendFunds({recipient, ether});
    yield this.GetAccountBalance(this.currentAccountAddress);
    yield this.GetAccountBalance(recipient);
  });

  GenerateMnemonic() {
    const wallet = this.rootStore.client.GenerateWallet();
    return wallet.GenerateMnemonic();
  }

  @action.bound
  SetCurrentAccount({signer}) {
    this.rootStore.InitializeClient(signer);

    this.currentAccountAddress = signer ?
      this.rootStore.client.utils.FormatAddress(signer.address) :
      undefined;

    this.GetAccountBalance(this.currentAccountAddress);

    localStorage.setItem(
      "elv-current-account",
      this.currentAccountAddress.toString()
    );
  }

  @action.bound
  AddAccount = flow(function * ({privateKey, encryptedPrivateKey, mnemonic, password}) {
    const client = this.rootStore.client;
    const wallet = client.GenerateWallet();

    let signer;
    if(mnemonic) {
      signer = wallet.AddAccountFromMnemonic({mnemonic});
    } else if(encryptedPrivateKey) {
      signer = yield wallet.AddAccountFromEncryptedPK({encryptedPrivateKey, password});
    } else {
      signer = wallet.AddAccount({privateKey});
    }

    encryptedPrivateKey = yield wallet.GenerateEncryptedPrivateKey({
      signer,
      password,
      options: {scrypt: {N: 16384}}
    });

    const address = client.utils.FormatAddress(signer.address);

    this.accounts[address] = {
      address,
      signer,
      encryptedPrivateKey,
      profile: {}
    };

    this.SaveAccounts();

    this.SetCurrentAccount({signer});

    yield this.rootStore.profilesStore.UpdatePublicMetadata(address);
  });

  @action.bound
  RemoveAccount(address) {
    if(!(Object.keys(this.accounts).includes(address))) {
      return;
    }

    if(this.currentAccountAddress === address) {
      this.rootStore.InitializeClient();
      this.currentAccountAddress = undefined;
    }

    delete this.accounts[address];

    this.SaveAccounts();
  }

  SaveAccounts() {
    let savedAccounts = {};
    Object.values(this.accounts).forEach(account =>
      savedAccounts[account.address] = {
        name: (account.name || "").toString(),
        profileImage: account.profileImage,
        address: account.address,
        encryptedPrivateKey: account.encryptedPrivateKey
      }
    );

    localStorage.setItem(
      "elv-accounts",
      btoa(JSON.stringify(savedAccounts))
    );
  }
}

export default AccountStore;

