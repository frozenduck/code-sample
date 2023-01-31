import {throwError as observableThrowError,  Observable ,  Subject  } from 'rxjs';
import {tap, takeUntil, mergeMap, take, filter, catchError} from 'rxjs/operators';
import { Component, Renderer2, EventEmitter, Output, ElementRef, ViewChild, ViewChildren, ChangeDetectorRef, HostListener, QueryList } from '@angular/core';
import { select } from '@angular-redux/store';
import { TabLinkComponent } from 'sharedFeatures/tab-link/tab-link.component';
import {PlanService, DialogCreationService, RedirectService, TeamService} from "sharedFeatures/sharedServices";
import { AuthService, OperationService, HistoryService } from "main_app/services";
import { PlanData, AuthData, BrixxPlan } from "sharedFeatures/sharedModels";
import { AppData } from "main_app/models";
import { LicensePackageType } from 'sharedFeatures/enums';
import { Utils, AuthUtils } from "sharedFeatures/utils";
import { BaseComponent } from "sharedFeatures/base";
import { AppComponent } from 'main_app/app.component';
import { SignalRService, SharedPlanHubClient } from 'main_app/signalR';
import { SharePlanPopup } from "sharedFeatures/share-plan-popup";
import { HistoryPlanPopup } from "main_app/history-plan-popup";
import { DownloadPopup } from "main_app/download-popup";
import { UpgradeWin } from 'sharedFeatures/upgrade-win';
import { ActivateLinkEvent } from "./activate-link-event";
import { NewPlanForm, NewPlanFormBodyComponent } from "sharedFeatures/newplan-win";
import { UpperDropDownMenuComponent } from "sharedFeatures/upperDropDownMenu";
import { CustomWindow } from 'sharedFeatures/@types/window';

declare let window: CustomWindow;
declare var jQuery: any;

@Component({
    selector: 'nav-menu',
    templateUrl: 'navmenu.component.html',
    styleUrls: ['navmenu.component.less']
})

export class NavMenuComponent extends BaseComponent {

    @Output() settingsCaller: EventEmitter<any> = new EventEmitter();
    @Output() dashBoardCaller: EventEmitter<any> = new EventEmitter();
    @Output() reportsCaller: EventEmitter<any> = new EventEmitter();
    @Output() timeLineCaller: EventEmitter<any> = new EventEmitter();
    @Output() actualsCaller: EventEmitter<any> = new EventEmitter();
    @Output() xeroCaller: EventEmitter<any> = new EventEmitter();

    activeTabLink: TabLinkComponent;

    @ViewChildren(TabLinkComponent)
    private links: QueryList<TabLinkComponent>;

    planName: string = "";
    private oldPlanName: string = "";

    @ViewChild('cnt') container: ElementRef;

    @ViewChild('timelineBtn') timelineBtn: TabLinkComponent;

    @ViewChild('rep', { read: ElementRef })
    rep: ElementRef;

    @ViewChild('actualsBtn', { read: ElementRef })
    private actualsBtn: ElementRef;

    @ViewChild('planText') planText: ElementRef;

    @ViewChild('shareButton', { read: ElementRef })
    shareButtonElement: ElementRef;

    @ViewChild('downloadButton', { read: ElementRef })
    private downloadButton: ElementRef;

    @ViewChild('versionBtn', { read: ElementRef })
    private versionBtn: ElementRef;

    @ViewChild('upperMenu')
    public upperMenu: UpperDropDownMenuComponent;

    IsTestButtonsVisible: boolean = false;

    isDownloadPlanActive: boolean = false;

    isLoggedIn: boolean = true;

    isDropDownShown: boolean = true;

    authData: AuthData;
    licenseStatus: string;

    plans: Array<BrixxPlan> = [];
    initialOwnPlans: Array<BrixxPlan> = [];

    // Unsubscribe event
    private storeUnsubscribe = new Subject<void>();

    @select(['plan', 'planData'])
    readonly planData$: Observable<PlanData>;
    PlanData: PlanData;

    @select(['appData', 'appComponent'])
    readonly appComponent$: Observable<AppComponent>;
    private appComponent: AppComponent;

    @select(['account', 'authData'])
    readonly authData$: Observable<AuthData>;

    @select(['appData', 'signalrConnected'])
    readonly signalrConnected$: Observable<boolean>;

    @select(['plan', 'sharedPlanEditMode'])
    readonly sharedPlanEditMode$!: Observable<string>;
    private sharedPlanEditMode: string = 'unset';
    private sharedPlanEditModeSubscribed: boolean = false;

    @select(['sharedPlan', 'onSharePlanToggle'])
    readonly onSharePlanToggle$: Observable<boolean>;
    private firstOnSharePlanToggle: boolean = true;

    @select(['sharedPlan', 'onUnsharePlanToggle'])
    readonly onUnsharePlanToggle$: Observable<boolean>;
    private firstOnUnsharePlanToggle: boolean = true;

    @select(['sharedPlan', 'onPlanEditedToggle'])
    readonly onPlanEditedToggle$: Observable<boolean>;
    private firstOnPlanEditedToggle: boolean = true;

    itemCount: number = 0;
    itemCountLimit: number = 100;
    itemCriticalLimit: number = 90;

    settingsTabTitle: string = 'SETTINGS';
    dashboardTabTitle: string = 'DASHBOARD';
    reportsTabTitle: string = 'REPORTS';
    timelineTabTitle: string = 'TIMELINE';
    actualsTabTitle: string = 'ACTUALS';
    xeroTabTitle: string = 'XERO';

    showTrialTimer: boolean = true;
    showTrialTimerUpgradeBtn: boolean = true;

    showUpgradeToEdit: boolean = false;

    settingsTabVisible: boolean = false;
    dashboardTabVisible: boolean = false;
    reportsTabVisible: boolean = false;
    timelineTabVisible: boolean = false;
    actualsTabVisible: boolean = false;
    shareButtonVisible: boolean = false;
    itemCounterVisible: boolean = true;
    invitedUsersTooltipVisible: boolean = false;
    xeroTabVisible: boolean = false;
    canShareOnCompany = true;

    private isLastViewHistory: boolean = false;

    private invitePopup: SharePlanPopup;
    private historyPopup: HistoryPlanPopup;


    private downloadPopup: DownloadPopup;

    private activateNewLink: EventEmitter<ActivateLinkEvent> = new EventEmitter();

    appData: AppData;

    private activePlansCount: number = 0;

    packageType: string = '';
    isReadonly: boolean = false;
    canCreateNewPlan: boolean = true;
    canSharePlan: boolean = true;


    constructor(public dialogCreation: DialogCreationService,
        private planService: PlanService,
        private authService: AuthService,
        private operationService: OperationService,
        private teamService: TeamService,
        private historyService: HistoryService,
        private redirectService: RedirectService,
        el: ElementRef,
        r: Renderer2,
        private chDet: ChangeDetectorRef,
        appData: AppData,
        private signalRService: SignalRService) {

        super(el, r);

        this.appData = appData;

        this.handleToggleAccountMenu = this.handleToggleAccountMenu.bind(this);
        this.beforeActualsSelect = this.beforeActualsSelect.bind(this);
    }

    ngOnInit() {
        // Subscribe on the redux store
        this.subscribeReduxStore();

        this.authData$.pipe(
            catchError(error => {
                console.error('Get AuthData error', error);
                return observableThrowError(error);
            }),
            filter(x => !!x),
            take(1), )
            .subscribe((authData: AuthData) => {
                if (this.authService.checkLoggedOnResult) {
                    if (authData != null) {

                        this.authData = authData;
                        this.licenseStatus = this.authData.licenseStatus;

                        this.packageType = AuthUtils.getLicensePackageType(this.authData.priceOptionCodes);

                        if (this.chDet['destroyed']) return;
                        this.IsTestButtonsVisible = window['isTestButtonsVisible'] == 'True';
                        this.isLoggedIn = authData.isAuthenticated;
                        this.isDownloadPlanActive = AuthUtils.isBetaFeatureActive(authData, 'DownloadPlan');
                        this.itemCountLimit = authData.planObjectLimit;
                        this.itemCriticalLimit = this.itemCountLimit - 10;

                        let selectedCompanyTeamGuid = localStorage.getItem('selectedCompanyTeamGuid');

                        if (this.isLoggedIn)
                            this.teamService.loadOthers(selectedCompanyTeamGuid).then((data) => {
                                let userInOthers = data.find(x => x.CustomerId === this.authData.userID);
                                if (userInOthers)
                                    this.canShareOnCompany = false;
                            });

                        // Change between readonly and editable modes
                        this.onEditModeChanged(this.packageType);
                    }

                    // BR-3988 this.reloadPlanData(); call moved to app.components.reloadPlanData
                }
            });

        this.isLastViewHistory = Utils.getCookie("isLastViewHistoryMode") == "true";

    }

    ngOnDestroy() {
        // Unsubscribe from the redux store
        this.storeUnsubscribe.next();
        this.storeUnsubscribe.complete();
    }

    // Subscribe on the redux store
    private subscribeReduxStore(): void {

        this.appComponent$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => this.appComponent = x);

        // When new plan was shared with user
        this.onSharePlanToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnSharePlanToggle) {
                    this.firstOnSharePlanToggle = false;
                    return;
                }

                this.appData.reloadPlans().then(() => { this.chDet.detectChanges(); });
            });

        // When one shared plan was removed
        this.onUnsharePlanToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnUnsharePlanToggle) {
                    this.firstOnUnsharePlanToggle = false;
                    return;
                }

                this.appData.reloadPlans().then(() => { this.chDet.detectChanges(); });
            });

        // Plan rename, update logo
        this.onPlanEditedToggle$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => {
                if (this.firstOnPlanEditedToggle) {
                    this.firstOnPlanEditedToggle = false;
                    return;
                }

                this.appData.reloadPlans().then(() => { this.chDet.detectChanges(); });
            });

        this.planData$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => this.PlanData = x);
    }

    private reloadPlans(): void {
        this.planService.getPlans(false);

        this.planService.PlansPromise
            .then((data: Array<BrixxPlan>) => {
                this.plans = data;

                let companyId = localStorage.getItem('selectedCompanyId');

                if (this.plans && this.plans.length > 0 && companyId) {

                    this.plans.forEach((pl: BrixxPlan) => {
                        if (pl.companyId === parseInt(companyId))
                            this.initialOwnPlans.push(pl);
                    });
                }

                this.chDet.detectChanges();
            })
            .catch(error => { console.error(error); });
    }

    public reloadPlanData(): void {

        this.appData.reloadPlans()?.then(() => { this.chDet.detectChanges(); });

        this.planData$.pipe(filter(x => !!x),take(1),
            tap((pl: PlanData) => {

                this.PlanData = pl;
                this.xeroTabVisible = this.PlanData.xeroConnected;
                this.actualsTabVisible = !this.xeroTabVisible;

                if (this.chDet['destroyed']) return;
                setTimeout(() => {
                    this.planName = pl.planName;
                    if (this.isLastViewHistory && !this.authData.isViewHistoryMode) this.versionHistoryClick();
                }, 0);

                // Subscribe on sharedPlanEditMode after planData was loaded
                if (!this.sharedPlanEditModeSubscribed) {
                    this.sharedPlanEditModeSubscribed = true;

                    this.sharedPlanEditMode$.pipe(
                        takeUntil(this.storeUnsubscribe))
                        .subscribe(x => {
                            this.sharedPlanEditMode = x;

                            this.onEditModeChanged(this.packageType);
                        });
                }
            }),
            mergeMap(() => this.operationService.GetNodesCount()),
            tap((count: number) => {
                this.itemCount = count;

            }),
            catchError(reason => {
                console.log('getPlanData error', reason);
                return observableThrowError(reason);
            }),)
            .subscribe(() => { });

        let companyId = localStorage.getItem('selectedCompanyId');

        let licenseId = (AuthUtils.getLicensePackageType(this.authData.priceOptionCodes) === LicensePackageType.PartnerV2) ? this.authData.licenseID : 0;

        if (companyId) {
            this.planService.GetActivePlansCount(this.authData.userID, parseInt(companyId))
                .then(x => {

                    this.activePlansCount = x.count;

                    // There is no upperMenu in view history mode
                    if (this.appComponent.menu.upperMenu) {
                        this.appComponent.menu.upperMenu.getPlansCount();
                    }
                });
        } else {
            this.canCreateNewPlan = false;
            this.canSharePlan = false;
        }

    }

    public refreshItemCount(): void {
        this.operationService.GetNodesCount()
            .then((count: number) => {
                this.itemCount = count;
            })
    }

    // Change between readonly and editable modes
    onEditModeChanged(packageType: string): void {
        if (this.sharedPlanEditMode === 'unset' || !this.authData) return;

        this.dashboardTabVisible = true;
        this.reportsTabVisible = true;

        let isSharedReadonly = (this.sharedPlanEditMode === window['sharedPlanReadOnly']);

        const isFreeSubscription = this.licenseStatus === 'Free';
        // BR-7459 'BX-1149 - Bike shop plan is read-only when no licence
        if (!this.PlanData.planTourActive && isFreeSubscription)
            isSharedReadonly = true;

        const isBulkTestReports = AuthUtils.isBetaFeatureActive(this.authData, 'BulkTestReports');
        this.isReadonly = isSharedReadonly || isBulkTestReports;
        let companyId = localStorage.getItem('selectedCompanyId');
        let isCompanyOwner = this.authData.userID.toString() === companyId;
        let isPlanOwner = window['isSharedPlan'] !== true;

        // Hide some buttons in readonly mode
        if (this.isReadonly) {
            this.settingsTabVisible = false;
            this.timelineTabVisible = false;
            this.actualsTabVisible = false;
            this.shareButtonVisible = this.canShareOnCompany && !(isSharedReadonly || isBulkTestReports || this.PlanData.planTourActive);
            this.shareButtonVisible = this.shareButtonVisible || (isCompanyOwner || isPlanOwner);
            this.itemCounterVisible = false;
            this.xeroTabVisible = false;
        }
        else {
            this.settingsTabVisible = true;
            this.timelineTabVisible = true;
            this.actualsTabVisible = !this.PlanData.xeroConnected;
            this.shareButtonVisible = this.canShareOnCompany;
            this.itemCounterVisible = true;
            this.xeroTabVisible = this.PlanData.xeroConnected;
        }

        // If free user has editable right show upgrade to edit text
        const isSharedPlanEditable = (this.sharedPlanEditMode === window['sharedPlanEditable']);
        this.showUpgradeToEdit = isFreeSubscription && isSharedPlanEditable;
    }


    @HostListener('window:resize')
    handleWindowResize(): void {
        this.updateLayout();
    }

    updateLayout(): void {

        if (!document.body)
            console.log('navmenu.updateLayout, document.body is null');


        // Hide upgrade button on small width
        if (document.body.clientWidth < 1050) {
            this.showTrialTimerUpgradeBtn = false;
        }
        else {
            this.showTrialTimerUpgradeBtn = true;
        }

        // Hide trial timer on small width
        if (document.body.clientWidth < 980) {
            this.showTrialTimer = false;
        }
        else {
            this.showTrialTimer = true;
        }

        // Hide menu items text on small width
        if (document.body.clientWidth < 965) {
            this.settingsTabTitle = '';
            this.dashboardTabTitle = '';
            this.reportsTabTitle = '';
            this.timelineTabTitle = '';
            this.actualsTabTitle = '';
        }
        else {
            this.settingsTabTitle = 'SETTINGS';
            this.dashboardTabTitle = 'DASHBOARD';
            this.reportsTabTitle = 'REPORTS';
            this.timelineTabTitle = 'TIMELINE';
            this.actualsTabTitle = 'ACTUALS';
        }

        this.updateHistoryPopupPosition();
        this.updateInvitePopupPosition();
        this.updateDownloadPopupPosition();

        this.chDet.detectChanges();

        this.r.setStyle(this.planText.nativeElement, "width", "");
    }

    ngAfterViewChecked() {
        if (this.planName != this.oldPlanName) {
            this.updateLayout();
            this.oldPlanName = this.planName;
        }
    }

    clearActive(): void {
        if (this.activeTabLink) this.activeTabLink.setClicked(false);
        this.activeTabLink = null;
    }

   /* public addLink(link: TabLinkComponent): void {
        this.links.push(link);
    }*/

    public getLinks(): QueryList<TabLinkComponent> {
        return this.links;
    }

    public gotoLink(path: string): void {
        let tPath = path;
        if (path.split("/")[0] == "settings")
            tPath = "settings";

        let lnks = this.getLinks();

        let sLink = null;
        lnks.forEach(lnk => {

            if (lnk.getPath() == tPath) sLink = lnk;

        });

        if (sLink) sLink.onSelect({});
    }

    settingsClick(isActivate: boolean) {
        this.settingsCaller.emit(isActivate);
    };

    dashBoardClick(isActivate: boolean) {
        this.dashBoardCaller.emit(isActivate);
    };

    reportsClick(isActivate: boolean) {
        this.reportsCaller.emit(isActivate);
    }

    timeLineClick(isActivate: boolean) {
        this.timeLineCaller.emit(isActivate);
    }

    actualsClick(isActivate: boolean) {
        this.actualsCaller.emit(isActivate);
    }

    xeroClick(isActivate: boolean) {
        this.xeroCaller.emit(isActivate);
    }

    oldGuiClick() {
        document.location.assign(window['fullLiveUrl']);
    }

    onDownloadPlan(isRecursive: boolean = false) {
        // Check if active form has unsaved changes
        this.appData.checkUnsavedChanges(() => {

            var filesHandlerUrl = window["fullLiveUrl"] + '/BrixxFiles/DownloadPlan';

            let filterNodeID = 0;

            if (window['filterNodeID'] != undefined)
                filterNodeID = window['filterNodeID'];

            jQuery.fileDownload(
                filesHandlerUrl,
                {
                    data: {
                        planGUID: this.PlanData.planGUID,
                        planName: this.PlanData.planName,
                        encryptionKey: "",
                        filterNodeID: filterNodeID,
                        userID: 0,
                        versionID:0
                    },
                    httpMethod: 'POST',
                    failCallback: (responseHtml, url) => {
                        // If request is recursive and balancer couldn't load plan show error dialog
                        if (isRecursive) {
                            this.appComponent.showPlanNotLoadedError();
                        }
                        else {
                            // Call balancer method CheckPlanLoaded and repeat request
                            this.appComponent.checkPlanLoaded()
                                .then(x => this.onDownloadPlan(true));
                        }
                    }
                });
        },
        false);
    }

    public handleNewPlanClick(connectMode: string): void {

        if (!this.authData)
            return;

        if (this.activePlansCount >= this.authData.maxPlans)
            return;

        let newplanForm = <NewPlanForm>this.appComponent.createDialog(NewPlanForm);
        newplanForm.setSize(document.body.clientWidth, document.body.clientHeight);
        newplanForm.authData = this.authData;
        newplanForm.plans = this.appData.getPlans();

        let appElem = this.appComponent.getElement();
        let x = (jQuery(appElem).width() - newplanForm.width) / 2;
        let y = (jQuery(appElem).height() - newplanForm.height) / 2;

        newplanForm.getAfterInit().subscribe(() => {

            let body = <NewPlanFormBodyComponent>newplanForm.getBodyComponent();
            body.setXeroImportModeEnabled(true);
            body.setConnectedToXero();

            if (connectMode == "existingplan")
                body.setConnectToExistingPlanMode();

            body.getActiveForm().ngOnChanges();

            newplanForm.show(0, 0);
        });

    }

    handleSignUpClick(): void {
        // Check if active form has unsaved changes
        this.appData.checkUnsavedChanges(() => {
            document.location.assign(window['ssoRegisterUrl']);
        },
        true);
    }

    handleToggleAccountMenu(callback: Function): void {

        const comp = this.appData.getSettingsComponent();
        if (comp) comp.onOut();

        const actuals = this.appData.getActuals();
        if (actuals && actuals.hasChanges)
            actuals.onSave(true);

        // Check if active form has unsaved changes
        this.appData.checkUnsavedChanges(() => {
            if (callback) callback();
        },
        false);
    }

    public onUpgrade(): void {

        let app = this.appComponent;

        if (this.authData.level < 1) {
            document.location.assign(window['ssoRegisterUrl']);
            return;
        }

        let upgradeWin = <UpgradeWin>app.createDialog(UpgradeWin);

        upgradeWin.getAfterInit().subscribe(() => {
            upgradeWin.setAuthData(this.authData);
        });

       
        upgradeWin.show(0, 0);
    }


    beforeReportsSelect(): boolean {

        if (!this.PlanData) return;

        /**
         * BR-3467
         * The free user receiving this invite will be able to view the dashboard but not reports.
         * The paid user receiving this invite will be able to view both the dashboard and reports.
         * But
         * BR-3498
         * If a paid user shares a plan with a free user they cannot see reports. They currently cannot and should be able to.
         * If a free user shares a plan with a free user they cannot see reports. This is correct.
         */

        // BR-6294 Reports should be enabled on free package
        if (this.packageType === LicensePackageType.None)
            return true;

        // BR-6179
        // commented due to BR-6218, reports should work on startup but without actuals
        // if (this.packageType === LicensePackageType.Startup && !(window['isSharedPlan']) && this.PlanData.xeroConnected) {
        //     this.showMiniUpgrade(this.rep.nativeElement);
        //     return false;
        // }

        // Level of plan owner
        const ownerLevel = window['isSharedPlan'] ? this.PlanData.ownerLevel : this.authData.level;

        const level = this.authData.level;

        if (level < 2 && !this.PlanData.planTourActive && !(window['isSharedPlan'] && ownerLevel >= 2)) {
            // If open reports from another tab
            if (this.activeTabLink) {
                this.showMiniUpgrade(this.rep.nativeElement);
            }
            // If open reports when restore last plan view
            else {
                this.gotoLink('content/dashboard');
            }

            return false;
        }

        return true;
    }

    beforeSettingsSelect(): boolean {
        if (!this.PlanData) return;

        if (this.sharedPlanEditMode === window['sharedPlanReadOnly']) {
            // If open settings when restore last plan view
            if (!this.activeTabLink) {
                this.gotoLink('content/dashboard');
            }

            return false;
        }

        return true;
    }

    beforeTimelineSelect(): boolean {
        if (!this.PlanData) return;

        if (this.sharedPlanEditMode === window['sharedPlanReadOnly']) {
            // If open timeline when restore last plan view
            if (!this.activeTabLink) {
                this.gotoLink('content/dashboard');
            }

            return false;
        }

        return true;
    }

    beforeActualsSelect(): boolean {
        if (!this.PlanData || !this.authData) return false;

        const packageType = AuthUtils.getLicensePackageType(this.authData.priceOptionCodes);

        // Actuals should be accessible for trials, Business, Pro, Partner and demo tour users
        const isActualsActive =
            this.authData.licenseStatus === 'Trial' ||
            packageType === LicensePackageType.Business ||
            packageType === LicensePackageType.Professional ||
            packageType === LicensePackageType.Partner ||
            packageType === LicensePackageType.PartnerV2 ||
            this.authData.isPlanTourActive;

        if (!isActualsActive) {
            // If open actuals from another tab
            if (this.activeTabLink) {
                this.showMiniUpgrade(this.actualsBtn.nativeElement);
            }
            // If open actuals when restore last plan view
            else {
                this.gotoLink('content/dashboard');
            }

            return false;
        }

        return true;
    }

    beforeXeroSelect(): boolean {
        return true;
    }

    handleUpgradeClick(): void {
        this.onUpgrade();
    }

    handleInviteClick(): void {

        if (!this.PlanData) {
            setTimeout(() => this.handleInviteClick(), 50);
            return;
        }

        this.invitePopup = <SharePlanPopup>this.appComponent.createDialog(SharePlanPopup);

        let appElem = this.appComponent.getElement();
        let x = jQuery(appElem).width() - this.invitePopup.getWidth();
        let y = 0;
        this.invitePopup.setSize(this.invitePopup.getWidth(), jQuery(appElem).height());

        this.invitePopup.planGUID = this.PlanData.planGUID;
        this.invitePopup.planName = this.PlanData.planName;
        this.invitePopup.planUrl = this.PlanData.planUrl;

        this.invitePopup.show(x, y).then(_ => {

            if (this.invitePopup)
                this.invitePopup.getOnClose().subscribe(() => {
                    this.invitePopup = null;
                });
        });
    }

    private updateInvitePopupPosition() {

        if (!this.invitePopup) return;

        let appElem = this.appComponent.getElement();
        jQuery(document.body).css('overflow', 'hidden');
        let x = jQuery(appElem).width() - this.invitePopup.getWidth();
        let y = 0;
        this.invitePopup.setPosition(x, y);
        this.invitePopup.setSize(this.invitePopup.getWidth(), jQuery(appElem).height());
        jQuery(document.body).css('overflow', '');
    }

    versionHistoryClick(): void {

        // Clear cookie
        document.cookie = 'isLastViewHistoryMode=false';
        this.isLastViewHistory = false;

        const isFreeSubscription = this.authData.licenseStatus === 'Free';

        if (isFreeSubscription) {
            this.showMiniUpgrade(this.versionBtn.nativeElement);
        }
        else {

            this.historyPopup = <HistoryPlanPopup>this.appComponent.createDialog(HistoryPlanPopup);

            let appElem = this.appComponent.getElement();
            let x = jQuery(appElem).width() - this.historyPopup.getWidth();
            let y = 0;
            this.historyPopup.setSize(this.historyPopup.getWidth(), jQuery(appElem).height());


            this.historyPopup.show(x, y);

            if (this.historyPopup)
                this.historyPopup.getOnClose().subscribe(() => {
                    this.historyPopup = null;
                });

        }
    }

    private updateHistoryPopupPosition() {

        if (!this.historyPopup) return;

        let appElem = this.appComponent.getElement();
        jQuery(document.body).css('overflow', 'hidden');
        let x = jQuery(appElem).width() - this.historyPopup.getWidth();
        let y = 0;
        this.historyPopup.setPosition(x, y);
        this.historyPopup.setSize(this.historyPopup.getWidth(), jQuery(appElem).height());
        jQuery(document.body).css('overflow', '');
    }

    restoreVersionClick(): void {
        // Start SignalR
        this.signalrConnected$.pipe(
            take(1))
            .subscribe(connected => {
                if (!connected) {
                    this.signalRService.init();
                }

                this.historyService.restoreVersion(this.authData.viewHistoryID).then(() => {
                    this.backToLatestVersionClick(false);
                    //document.location.reload();
                });
            });
    }

    backToLatestVersionClick(isLastViewHistoryMode: boolean): void {
        localStorage.setItem('viewVersionID', '0');
        window['viewVersionID'] = 0;
        document.cookie = `isLastViewHistoryMode=${isLastViewHistoryMode}`;
        this.isLastViewHistory = isLastViewHistoryMode;

        this.authData.viewHistoryID = 0;
        this.authData.isViewHistoryMode = false;

        // Start SignalR
        this.signalrConnected$.pipe(
            take(1))
            .subscribe(connected => {
                if (!connected) {
                    this.signalRService.init();
                }

                SharedPlanHubClient.onPlanRestored();

                this.appComponent.removeHistoryViewMode();
            });

        //document.location.reload();
    }

    // On hover SHARE button show tooltip with invited users
    onShareBtnMouseEnter() {
        this.invitedUsersTooltipVisible = true;
    }

    onShareBtnMouseLeave() {
        this.invitedUsersTooltipVisible = false;
    }

    helpClick(): void {
        window.open("https://businesshelp.brixxsupport.com/support/solutions", '_blank');
    }

    onPeopleClick(): void {
        if (this.appData.getSettingsComponent()) this.appData.getSettingsComponent().onOut();
        this.redirectService.toPeople();
    }

    onOpenNewPlan(): void {

        localStorage.setItem('isConnectToXero', '0');

        this.appData.getAppComponent().closeOverlays();

        this.onPlanCreate();
    }

    onPlanCreate(callback?): void {

        let newplanForm = <NewPlanForm>this.appComponent.createDialog(NewPlanForm);
        newplanForm.setSize(document.body.clientWidth, document.body.clientHeight);

        newplanForm.authData = this.authData;
        newplanForm.plans = this.appData.getPlans();

        newplanForm.getAfterInit().subscribe(() => {

            let body = <NewPlanFormBodyComponent>newplanForm.getBodyComponent();
            body.setXeroImportModeEnabled(false);
            body.setConnectedToXero();

            body.getActiveForm().ngOnChanges();

            newplanForm.show(0, 0);
            if (callback) callback();

        });
    }

    handleDownloadClick(): void {

        let creator = this.appComponent;

        const packageType = AuthUtils.getLicensePackageType(this.authData.priceOptionCodes);

        // Actuals should be accessible for trials, Business, Pro, Partner and demo tour users
        const isDownloadDisabled =
            packageType === LicensePackageType.FreeSalesForecast;

        if (this.licenseStatus !== 'Full' || isDownloadDisabled) {
            const el = this.downloadButton.nativeElement;
            const pos = jQuery(el).offset();
            creator.showMiniUpgrade(pos.left + jQuery(el).width() / 2, pos.top + jQuery(el).height());

            return;
        }

        let appElem = creator.getElement();
        this.downloadPopup = <DownloadPopup>creator.createDialog(DownloadPopup);

        let x = jQuery(appElem).width() - this.downloadPopup.getWidth();
        let y = 0;

        this.downloadPopup.setSize(this.downloadPopup.getWidth(), jQuery(appElem).height());

        this.downloadPopup.show(x, y);

        if (this.downloadPopup)
            this.downloadPopup.getOnClose().subscribe(() => {
               this.downloadPopup = null;
            });
    }

    private updateDownloadPopupPosition() {

        if (!this.downloadPopup) return;

        let appElem = this.appComponent.getElement();
        jQuery(document.body).css('overflow', 'hidden');
        let x = jQuery(appElem).width() - this.downloadPopup.getWidth();
        let y = 0;
        this.downloadPopup.setPosition(x, y);
        this.downloadPopup.setSize(this.downloadPopup.getWidth(), jQuery(appElem).height());
        jQuery(document.body).css('overflow', '');
    }

    linkOnSelect(link: TabLinkComponent, ev): void {

        let isActivate = (this.activeTabLink != link);
        if (isActivate) {
            this.activateNewLink.emit(new ActivateLinkEvent(this.activeTabLink, link));
        }
        // Autosave actuals on changed tab
        let savePromise = Promise.resolve();

        const actuals = this.appData.getActuals();
        if (actuals && actuals.hasChanges)
            savePromise = actuals.onSave(true);

        savePromise.then(x => {

            // Check if active form has unsaved changes
            this.appData.checkUnsavedChanges(() => {

                link.doAfterSelect();

                let oldLink = this.activeTabLink;

                if (isActivate) {
                    this.clearActive();
                }

                this.activeTabLink = link;

                if (isActivate) this.activateNewLink.emit(new ActivateLinkEvent(oldLink, this.activeTabLink));

                // Store last view of plan in database
                //(link.getPath() !== 'settings')
                this.appData.getAppComponent().SetPlanLastView('route', link.getPath() == 'settings' && this.PlanData.lastView.route?.includes("settings") ? this.PlanData.lastView.route : link.getPath());

            },
            true);

        });
    }

    public getActivateNewLink(): EventEmitter<ActivateLinkEvent> {
        return this.activateNewLink;
    }

    public onChangeTeamOwner(newOwnerId: number): void {
        if (!this.authData) {
            setTimeout(() => this.onChangeTeamOwner(newOwnerId), 50);
            return;
        }

        this.authData.teamOwnerId = newOwnerId;
    }
}