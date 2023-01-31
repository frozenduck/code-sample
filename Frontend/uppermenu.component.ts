import {throwError as observableThrowError,  Observable ,  Subject } from 'rxjs';
import {map, takeUntil, catchError, filter, mergeMap, take} from 'rxjs/operators';
import {
    Component,
    ElementRef,
    Renderer2,
    ViewChild,
    Inject,
    forwardRef,
    ChangeDetectorRef
} from '@angular/core';
import { select } from '@angular-redux/store';
import {Account, AuthData, SpareLicenseModel} from "sharedFeatures/sharedModels";
import {AccountService, BillingService, PlanService, TeamService} from "sharedFeatures/sharedServices";
import { TabLinkSimpleComponent } from './tab-link-simple.component';
import { AccountAppComponent } from 'account_app/account_app.component';
import { InactivePlansWinComponent } from 'account_app/window';
import { UpgradeWin, UpgradeWinBodyComponent } from 'sharedFeatures/upgrade-win';
import { BrixxPlan } from "sharedFeatures/sharedModels";
import { Utils, AuthUtils } from 'sharedFeatures/utils';
import { LicenseFrequency, LicensePackageType } from 'sharedFeatures/enums';
import { UpperDropDownMenuComponent } from 'sharedFeatures/upperDropDownMenu';
import { NewPlanForm, NewPlanFormBodyComponent } from "sharedFeatures/newplan-win";
import { CustomWindow } from 'sharedFeatures/@types/window';
import { ComboComponent, ItemData } from "sharedFeatures/form";
import { Company } from "sharedFeatures/sharedModels";
import { ProfileService } from "sharedFeatures/sharedServices";
import { accountActions } from "sharedFeatures/store";
import { CompanyWin } from "account_app/company";
import { DialogCreationService } from "sharedFeatures/sharedServices";
import { Router } from "@angular/router";
import {teamActions} from "account_app/store";

declare let window: CustomWindow;
declare var jQuery: any;

@Component({
    selector: 'uppermenu',
    templateUrl: 'uppermenu.component.html',
    styleUrls: ['uppermenu.component.less'],
})

export class UpperMenuComponent {
    @ViewChild('upperDropDownMenu')
    upperDropDownMenu!: UpperDropDownMenuComponent;

    @ViewChild('companyCombo')
    companyCombo!: ComboComponent;
    selectedCompanyNum: number | undefined;
    comboItems: Array<ItemData> = [];
    companies: Array<Company> = [];

    initialOwnPlans: Array<BrixxPlan> = [];
    otherPlans: Array<BrixxPlan> = [];

    isCellContentCenter: boolean = true;
    activeTabLink: TabLinkSimpleComponent | undefined;
    // companyComponent: CompanyPaneBodyComponent = <CompanyPaneBodyComponent>{};
    plans: Array<BrixxPlan> = [];
    isDropDownShown: boolean = true;

    loggedUserLevel: number = 0;
    customerRef: number = 0;
    isBillingAvailable: boolean = false;

    licenseStatus: string = '';
    licenseColor: string = 'g4Color';
    licenseExpiredNoticeCount: number = 0;
    licenseVisible: boolean = false;

    //licenses: Array<SpareLicenseModel> = [];
    spareLicencesCount: number = 0;

    private links: Array<TabLinkSimpleComponent> = new Array<TabLinkSimpleComponent>();
    private spareLicenses: Array<SpareLicenseModel> = new Array<SpareLicenseModel>();
    private partnerLicenseIds: Array<number> = [];

    nonPartnerSpareLicensesCount: number = 0;
    spareLicensesCount2: number = 0;

    userId: number = 0;
    isTeamOwner: boolean = false;
    isLicenseOwner: boolean = false;
    isSelectedOwnCompany: boolean = true;
    isPeopleAndCompanyTabsVisible: boolean = false;
    canUpgradeBool: boolean = false;
    upgradeBtnText = 'Upgrade';
    upgradeBtnWidth = 110;

    companyWinHeight: number = 0;

    clearActive(): void {

        if (this.activeTabLink) this.activeTabLink.setClicked(false);
        this.activeTabLink = undefined;
    }

    // Unsubscribe event
    private storeUnsubscribe = new Subject<void>();

    @select(['account', 'authData'])
    readonly authData$!: Observable<AuthData>;
    authData: AuthData;

    @select(['account', 'accountData'])
    readonly accountData$!: Observable<Account>;

    @select(['sharedPlan', 'onSharePlanToggle'])
    readonly onSharePlanToggle$!: Observable<boolean>;
    private firstOnSharePlanToggle: boolean = true;

    @select(['sharedPlan', 'onUnsharePlanToggle'])
    readonly onUnsharePlanToggle$!: Observable<boolean>;
    private firstOnUnsharePlanToggle: boolean = true;

    @select(['sharedPlan', 'onPlanEditedToggle'])
    readonly onPlanEditedToggle$!: Observable<boolean>;
    private firstOnPlanEditedToggle: boolean = true;

    private curPackage: string = LicensePackageType.None;

    private isFirstCompanyChange: boolean = true;

    constructor(
        private accService: AccountService,
        private element: ElementRef,
        r: Renderer2,
        @Inject(forwardRef(() => AccountAppComponent)) private app: AccountAppComponent,
        private chDet: ChangeDetectorRef,
        private planservice: PlanService,
        private billingService: BillingService,
        private dialogCreation: DialogCreationService,
        private teamService: TeamService,
        private accountService: AccountService,
        private profileService: ProfileService,
        private router: Router,
        @Inject(forwardRef(() => DialogCreationService)) public dialogService: DialogCreationService
    ) {


    }

    countSpareLicenses(spareLicenses: Array<SpareLicenseModel>): void {
        //console.log("licences upper menu", this.licenses);
        this.spareLicencesCount = 0;
        spareLicenses.forEach(x => {
            // check for 'unlimited' Partner v2 licenses
            let spareAmount = x.SpareAmount >= 1000000 ? 1 : x.SpareAmount;
            this.spareLicencesCount += spareAmount;
        });
        console.log(this.spareLicencesCount);
    }

    loadSpareLicenses(companies: Array<Company> = []): void {
        this.billingService.GetSpareLicenses()
            .then((data) => {
                if (data.success) {
                    this.partnerLicenseIds = data.spareLicenses.filter(x => x.LicenseType.indexOf('Partner') !== -1 && x.LicenseType !== 'Partner').map(x => x.ID);
                    this.spareLicenses = data.spareLicenses;
                    this.countSpareLicenses(<Array<SpareLicenseModel>>data.spareLicenses);
                    this.loadUnassignedLicenseCounter(companies, this.partnerLicenseIds, this.spareLicenses);

                    this.companyWinHeight = (this.partnerLicenseIds.length > 0) ? 475 : (companies.length === 0) ? 400 : 330;
                }
                else {
                    //console.log("no licences");
                }
            })
            .catch(error => {
                this.dialogCreation.createUnknownExceptionDialog(error).show();
            });
    }

    ngOnInit(): void {
        // Subscribe on the redux store
        this.subscribeReduxStore();
        //this.loadSpareLicenses();
        this.reloadAuthData(null, false, false);
    }

    ngOnDestroy() {
        // Unsubscribe from the redux store
        this.storeUnsubscribe.next();
        this.storeUnsubscribe.complete();
    }

    // Subscribe on the redux store
    private subscribeReduxStore(): void {
        // When new plan was shared with user
        this.onSharePlanToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnSharePlanToggle) {
                    this.firstOnSharePlanToggle = false;
                    return;
                }

                this.reloadPlans(true);
            });

        // When one shared plan was removed
        this.onUnsharePlanToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnUnsharePlanToggle) {
                    this.firstOnUnsharePlanToggle = false;
                    return;
                }

                this.reloadPlans(true);
            });

        // Plan rename, update logo
        this.onPlanEditedToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnPlanEditedToggle) {
                    this.firstOnPlanEditedToggle = false;
                    return;
                }

                this.reloadPlans(true);
            });
    }

    setLocalStorageVars(selectedCompany: Company): void {
        if (!Utils.isNumeric(selectedCompany.Id))
            throw new Error(`uppermenu.setLocalStorageVars: selectedCompanyId:${selectedCompany.Id} is not numeric`);

        localStorage.setItem('selectedCompanyCustomerEmail', selectedCompany.Email);
        localStorage.setItem('selectedCompanyId', selectedCompany.Id + '');
        localStorage.setItem('selectedCompanyName', selectedCompany.CompanyName);
        localStorage.setItem('selectedCompanyCustomerId', selectedCompany.CustomerId + '');
        localStorage.setItem('selectedCompanyTeamGuid', selectedCompany.TeamGuid + '')
    }

    public getPeople(companyId: number, callback?: Function): Promise<any> {
        let selectedCompany = this.companies.find(x => x.Id === companyId);

        return this.teamService.loadPeople(selectedCompany?.TeamGuid).then((data) => {
            if (data) {
                let userInTeam = data.find(x => x.CustomerId === this.authData.userID);
                this.isPeopleAndCompanyTabsVisible = !!userInTeam;
                this.isSelectedOwnCompany = selectedCompany.CustomerId === this.authData.userID;

                if (callback)
                    callback();
            }
        });
    }

    initPlans(callback?: Function): void {
        let selectedCompanyId = this.authData.lastCompanyId;

        this.reloadPlans(false, () => {
            if (this.plans && this.plans.length > 0) {

                this.otherPlans = [];
                this.initialOwnPlans = [];

                this.plans.forEach((pl: BrixxPlan) => {
                    // if (pl.isShared) {
                    // Don't show inactive shared plans
                    //if (pl.isChoosedToKeep !== 0)  //BR-6984
                    this.otherPlans.push(pl);
                    // }

                    if (pl.companyId === selectedCompanyId) {

                        if (this.isSelectedOwnCompany && pl.isChoosedToKeep != 0)
                            pl.rights = null;

                        this.initialOwnPlans.push(pl);
                    }
                });
            }

            if (!this.isSelectedOwnCompany) {
                if (this.app.myplans.otherPlans) {
                    let otherPlans = this.otherPlans.filter(x => x.companyId === selectedCompanyId);

                    if (!otherPlans || otherPlans.length < 1) {
                        this.app.myplans.ownPlans = [];
                    }
                    else {
                        this.app.myplans.ownPlans = otherPlans;
                    }
                }
            }
            else {
                this.app.myplans.ownPlans = this.initialOwnPlans;
            }

            if (callback)
                callback();
            
        });
    }

    onCompanyChanged(companyId: number): void {
        Utils.setLoading(true);
        if (companyId) {
            this.selectedCompanyNum = companyId;

            let selectedCompany = this.companies.find(x => x.Id === companyId);

            if (!selectedCompany) {
                this.app.myplans.ownPlans = [];
                Utils.setLoading(false);
                return;
            }

            this.setLocalStorageVars(selectedCompany);
            this.authData.lastCompanyId = selectedCompany.Id;

            let peoplePromise: Promise<any>;

            this.accountService.changeLastCompanyId(selectedCompany.Id)
                .then(() => {
                    peoplePromise = this.getPeople(selectedCompany.Id);

                    return peoplePromise;
                })
                .then(() => {
                    this.app.onCompanyChanged(this.isFirstCompanyChange, () => {


                        if (!this.isFirstCompanyChange)
                            this.reloadAuthData();

                        this.isFirstCompanyChange = false;
                        this.refreshAuthData(this.app.AuthData);
                        //this.profileService.LoadCompany(selectedCompany.Id + '');

                        this.isSelectedOwnCompany = selectedCompany.CustomerId === this.authData.userID;
                        console.log('loadPeople from uppermenu onCompanychanged');

                        accountActions.setCompanyChanged();
                        this.initPlans(() => {
                            peoplePromise.then(() => {
                                this.app.isUpperMenuLoaded = true;
                                this.app.closeSpinnerIfAllLoaded();
                            });
                        });

                    });
                })
                .catch(reason => {
                    console.log('changeLastCompanyId error', reason);
                    Utils.setLoading(false);
                });


        }
    }

    onNewCompanyClick(event): void {
        let companyWin = <CompanyWin>this.dialogService.getDialogCreator().createDialog(CompanyWin);
        //companyWin.setSize(window.innerWidth, window.innerHeight);
        companyWin.setSize(jQuery(document.body).width(), jQuery(document.body).height());
        companyWin.show(0, 0);
    }

    public reloadAuthData(callback? : Function, forceReloadPlans: boolean = false, forceReloadSubscription: boolean = true): void {
        // Subsribe on authData from the redux store
        this.accountData$.pipe(
            catchError(error => {
                console.error('Get AuthData error', error);
                return observableThrowError(error);
            }),
            filter(x => !!x),
            take(1),
            mergeMap((account: Account) => this.authData$.pipe(map(authData => { return { account, authData }; }))),
            filter(x => !!x.account && !!x.authData),
            take(1),)
            .subscribe(data => {
                this.customerRef = data.account.customerRef;

                this.refreshAuthData(data.authData);

                this.isLicenseOwner = (this.authData.licenseOwnerEmail === this.authData.email);
                this.isTeamOwner = (this.authData.teamOwnerId == this.authData.userID);
                this.licenseVisible = this.isLicenseVisible();

                if (forceReloadSubscription) {
                    console.log('LoadSubscriptions() from uppermenu.reloadAuthData');
                    this.billingService.LoadSubscriptions();
                }

                this.loadCompanies();

                this.chDet.detectChanges();

                let toPeople = Utils.getQueryParam(document.location.href, 'toPeople');

                // If user was joined to team open People page
                if (window["joinTeamSucceeded"])
                    toPeople = 'true';

                if (toPeople === 'true')
                    this.gotoPeople();
                else
                    this.goToRoute();

                if (window['ToAccountUpgrade'] === true) this.gotoUpgrade();

                this.reloadPlans(forceReloadPlans, callback);
                this.canUpgradeBool = this.canUpgrade();
            });
    }

    public loadCompanies(): void {
        this.billingService.LoadCompanies(this.authData.userID + '')
            .then(data => {
                this.companies = data;

                this.loadSpareLicenses(this.companies);

                this.comboItems = this.companies.map(x => {
                    return {
                        id: x.Id,
                        value: x.CompanyName,
                        selected: x.IsSelected,
                        disabled: false
                    };
                });

                if (!this.comboItems || this.comboItems.length == 0) {
                    let companyWin = <CompanyWin>this.dialogService.getDialogCreator().createDialog(CompanyWin);
                    companyWin.setAuthData(this.authData);
                    companyWin.companyWinHeight = this.companyWinHeight;
                    companyWin.setSize(jQuery(document.body).width(), jQuery(document.body).height());
                    companyWin.show(0, 0);
                }

                let lastCompanyId = this.authData.lastCompanyId;
                let lastCompany = this.comboItems.find(x => x.id == lastCompanyId);
                if (lastCompany)
                    this.selectedCompanyNum = lastCompany.id;
                else {
                    if (this.comboItems && this.comboItems[0])
                        this.selectedCompanyNum = this.comboItems[0].id;
                    let companyId = localStorage.getItem('selectedCompanyId');
                    if (companyId) {
                        let item = this.comboItems.find(x => x.id == companyId);
                        if (item) this.selectedCompanyNum = item.id;
                    }
                }
            });
    }

    loadUnassignedLicenseCounter(companies: Array<Company>, partnerLicenseIds: Array<number>, spareLicenses: Array<SpareLicenseModel>) {
        this.spareLicensesCount2 = 0;

        let assignedPartnerLicenseIds = companies.filter(x => partnerLicenseIds.includes(x.License_ID)).map(x => x.License_ID);
        let unassignedPartnerLicenseIds = partnerLicenseIds.filter(x => !assignedPartnerLicenseIds.includes(x));

        if (spareLicenses.length > 0 || unassignedPartnerLicenseIds.length > 0) {
            let nonPartnerSpareLicenses = spareLicenses.filter(x => !partnerLicenseIds.includes(x.ID));

            this.nonPartnerSpareLicensesCount = nonPartnerSpareLicenses.length;

            if (nonPartnerSpareLicenses.length > 0)
                this.spareLicensesCount2 = nonPartnerSpareLicenses.reduce((a,b) => (a+b.SpareAmount), 0);

            if (unassignedPartnerLicenseIds.length > 0)
                this.spareLicensesCount2+= unassignedPartnerLicenseIds.length;
        }
    }

    isLicenseVisible(): boolean {
        let result = false;

        if (this.licenseStatus === 'Trial' || this.licenseStatus === "Free")
            result = true;

        if (this.licenseStatus !== 'Trial' && (this.isTeamOwner || this.isLicenseOwner))
            result = true;

        //console.log('license visible from uppermenu ' + result);
        return result;
    }

    private goToRoute(): void {
        const route = localStorage.getItem('route');
        const link = this.getLinks().find(x => x.getPath() === route);

        if (route === 'newplan-start-form-body') {
            this.app.onPlanCreate();
            localStorage.setItem('route', undefined);
        }

        if (link)
            link.onSelect();
    }

    private refreshAuthData(data: AuthData): void {
        this.authData = data;
        this.userId = this.authData.userID;

        this.curPackage = AuthUtils.getLicensePackageType(data.priceOptionCodes);

        this.loggedUserLevel = data.level;
        this.licenseStatus = data.licenseStatus;
        this.licenseExpiredNoticeCount = data.expiredNoticeCount;

    }

    public reloadPlans(reload: boolean, callback?: Function): void {
        if (reload) {
            this.loadSpareLicenses();
            this.planservice.getPlans(false);
        }

        if (this.planservice.PlansPromise)
            this.planservice.PlansPromise
                .then((data: Array<BrixxPlan>) => {
                    this.plans = data;

                    if (callback)
                        callback();
                })
                .catch(error => { console.error(error); });

        if (this.profileService.companyPromise){
            this.profileService.companyPromise.then((data) => {
                try {
                    if (data && !Utils.isNullOrEmpty(data)) {
                        let result = <Company>JSON.parse(data).data;
                        if(result.Id == 0) {

                            let companyWin = <CompanyWin>this.dialogService.getDialogCreator().createDialog(CompanyWin);
                            companyWin.setAuthData(this.authData);
                            companyWin.companyWinHeight = this.companyWinHeight;
                            companyWin.setSize(window.innerWidth, window.innerHeight);

                            companyWin.show(0, 0);
                        }
                    }
                } finally {
                }
            });
        }
    }

    public addLink(link: TabLinkSimpleComponent): void {

        this.links.push(link);
    }

    public getLinks(): Array<TabLinkSimpleComponent> {

        return this.links;
    }

    private showInactivePlansIf(): void {

        let appElem = this.app.getElement();
        let plansDialog = <InactivePlansWinComponent>this.app.createDialog(InactivePlansWinComponent);

        let x = (jQuery(appElem).width() - plansDialog.width) / 2;
        let y = (jQuery(appElem).height() - plansDialog.height) / 2;

        plansDialog.show(x, y);
    }

    public onMyPlansActivate(): void {
        if (!this.authData) {
            setTimeout(() => this.onMyPlansActivate(), 50);
            return;
        }

        // Do fire onSortChanged event when combo is initializing
        this.app.firstSortChanged = true;

            let loggedUserLevel = this.authData.level;

            let plansLen = 0;

            // Count only own plans
            if (this.accService.Plans) {
                this.accService.Plans.forEach(x => {
                    if (!x.isShared) plansLen++;
                });
            }

            let choosedToKeepSelected = this.authData.choosedToKeepSelected;

            if ((loggedUserLevel < 2) && (plansLen > 3)) {
                if (!choosedToKeepSelected) {
                    this.showInactivePlansIf();
                }
            }

            this.app.activateTopMenu();
    }

    public onSignOut(): void {
        window['isSignOut'] = true;

        // Clear stored ConversationId (used in logging)
        Utils.clearConversationId();

        document.location.href = window["ssoLogoutUrl"];
    }

    onPeopleClick(): void {

        this.gotoPeople();

    }

    public gotoMyPlans(): void {

        let lnks = this.getLinks();

        let myplansLink: TabLinkSimpleComponent | undefined;
        lnks.forEach(lnk => {

            if (lnk.getPath() == 'myplans') myplansLink = lnk;

        });

        if (myplansLink) myplansLink.onSelect();

    }

    public gotoAccountDetails(): void {

        let lnks = this.getLinks();

        let accountDetailsLink: TabLinkSimpleComponent | undefined;
        lnks.forEach(lnk => {

            if (lnk.getPath() == 'myprofile') accountDetailsLink = lnk;

        });

        if (accountDetailsLink) accountDetailsLink.onSelect();

    }

    public gotoLicense(): void {

        let lnks = this.getLinks();

        let licenseLink: TabLinkSimpleComponent | undefined;
        lnks.forEach(lnk => {

            if (lnk.getPath() == 'license') licenseLink = lnk;

        });

        if (licenseLink) licenseLink.onSelect();
    }

    public gotoSubscription(): void {

        this.upperDropDownMenu.toBilling();
    }

    gotoUpgrade(): void {
        // Reset toAccountUpgrade URL flag
        window['ToAccountUpgrade'] = false;

        this.onUpgrade();
    }

    public gotoPeople(): void {

        let lnks = this.getLinks();

        let peopleLink: TabLinkSimpleComponent | undefined;
        lnks.forEach(lnk => {

            if (lnk.getPath() == 'people') peopleLink = lnk;

        });

        if (peopleLink) peopleLink.onSelect();
    }

    public onUpgrade(): void {
        this.showUpgradeWin(false);
        //this.gotoUpgrade();
    }

    public onBuyNew(): void {
        this.showUpgradeWin(true);
    }

    handleUpgradeClick(): void {
        this.showUpgradeWin(false);
    }

    handlePurchaseClick(): void {
        this.showUpgradeWin(true);
    }

    private showUpgradeWin(isBuyNew: boolean): void {
        if (!this.authData) {
            setTimeout(() => this.showUpgradeWin(isBuyNew), 50);
            return;
        }

        localStorage.setItem('isFromManageBillingPanel', 'false');
        let upgradeWin = <UpgradeWin>this.app.createDialog(UpgradeWin);

        upgradeWin.getAfterInit().subscribe(() => {
            upgradeWin.setAuthData(this.authData);
            if (isBuyNew) {
                let body = <UpgradeWinBodyComponent>upgradeWin.getBodyComponent();
                body.isForceBuyLink = true;
            }
            upgradeWin.setSize(jQuery(document.body).width(), jQuery(document.body).height());
            upgradeWin.show(0, 0);
        });
    }

    public onChangeTeamOwner(newOwnerId: number): void {
        if (!this.authData) {
            setTimeout(() => this.onChangeTeamOwner(newOwnerId), 50);
            return;
        }

        teamActions.toggleOnChangeOwner();
        this.authData.teamOwnerId = newOwnerId;
        this.isTeamOwner = (this.authData.teamOwnerId == this.authData.userID);
    }

    getCurrentPackageName(): string {

        switch (this.curPackage) {

            case LicensePackageType.None: this.licenseColor = 'c2Color'; return 'No licence - plans set to read only';
            case LicensePackageType.Startup: this.licenseColor = 'g4Color'; return LicensePackageType.Startup + ' licence';
            case LicensePackageType.Business: this.licenseColor = 'g4Color'; return LicensePackageType.Business + ' licence';
            case LicensePackageType.Professional: this.licenseColor = 'g4Color'; return LicensePackageType.Professional + ' licence';
            case LicensePackageType.FreeSalesForecast: this.licenseColor = 'g4Color'; return LicensePackageType.FreeSalesForecast + ' licence';
            case LicensePackageType.Partner: this.licenseColor = 'g4Color'; return LicensePackageType.Professional + ' licence';
            case LicensePackageType.PartnerV2: this.licenseColor = 'g4Color'; return LicensePackageType.Partner + ' licence';

            default: return 'Basic licence';
        }
    }

    onCreateStandartPlan(callback?: Function): void {

        var appType = window["timeOutAppType"];
        var self = window[appType] as any;

        let newplanForm = <NewPlanForm>self.createDialog(NewPlanForm);
        newplanForm.setSize(document.body.clientWidth, document.body.clientHeight);

        newplanForm.authData = self.AuthData;
        newplanForm.plans = self.myplans.getPlans();

        newplanForm.getAfterInit().subscribe(() => {

            let body = <NewPlanFormBodyComponent>newplanForm.getBodyComponent();
            body.setXeroImportModeEnabled(false);
            body.setConnectedToXero();

            body.getActiveForm().ngOnChanges();


            newplanForm.show(0, 0);
            if (callback) callback();

        });

    }

    onOpenNewPlan(): void {

        if (!this.authData) {
            setTimeout(() => this.onOpenNewPlan(), 50);
            return;
        }

        this.onCreateStandartPlan();

    }

    canUpgrade(): boolean {
        if (!this.authData.isLicenseOwner)
            return false;

        let packageType = AuthUtils.getLicensePackageType(this.authData.priceOptionCodes);
        let frequency = AuthUtils.getLicenseFrequency(this.authData.priceOptionCodes);

        let cannotUpgrade = packageType == LicensePackageType.Partner || (this.authData.priceOptionCodes.indexOf('Partner50') !== -1 && frequency === 'Annually');

        if (packageType == LicensePackageType.Professional && frequency == LicenseFrequency.Annually || (packageType == LicensePackageType.PartnerV2 && !cannotUpgrade)) {
            this.upgradeBtnText = 'Get more plans';
            this.upgradeBtnWidth = 120;
            return true;
        }

        return !cannotUpgrade;
    }

}
