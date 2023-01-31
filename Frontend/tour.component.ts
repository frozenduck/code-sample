import {throwError as observableThrowError,  Observable ,  Subject } from 'rxjs';
import {filter, catchError, take, takeUntil} from 'rxjs/operators';
import { Component, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { select } from '@angular-redux/store';
import { AppData } from 'main_app/models';
import { AuthData } from "sharedFeatures/sharedModels"
import { AuthService } from "main_app/services";
import { PlanService, DialogCreationService } from "sharedFeatures/sharedServices";
import { StepType } from './enums/step-type';
import { FinishType } from './enums/finish-type';
import { DisclaimerPopup } from './steps/disclaimer-popup/disclaimer-popup.component';
import { AppComponent } from 'main_app/app.component';
import { appDataActions } from 'main_app/store';
import { NewPlanForm, NewPlanFormBodyComponent } from "sharedFeatures/newplan-win";
import { AuthUtils } from "sharedFeatures/utils";
import { CustomWindow } from 'sharedFeatures/@types/window';
import { LicensePackageType } from "sharedFeatures/enums";

declare let window: CustomWindow;

declare let jQuery: any;

@Component({
    selector: 'tour',
    templateUrl: './tour.component.html',
    styleUrls: ['./tour.component.less']
})
export class TourComponent {
    @ViewChild('tourMask')
    private tourMask!: ElementRef;

    step: StepType = StepType.Welcome;

    stepType = StepType;

    authData: AuthData = new AuthData();

    canCreateNewPlan: boolean = true;

    // Unsubscribe event
    private storeUnsubscribe = new Subject<void>();

    @select(['appData', 'appComponent'])
    readonly appComponent$!: Observable<AppComponent>;
    private appComponent: AppComponent | undefined;

    @select(['account', 'authData'])
    readonly authData$!: Observable<AuthData>;

    @select(['dialogCreation', 'newPlanDialogOpen'])
    readonly newPlanDialogOpen$!: Observable<boolean>;
    private newPlanDialogOpen: boolean = false;


    constructor(
        private appData: AppData,
        private planService: PlanService,
        private authService: AuthService,
        private dialogCreation: DialogCreationService,
        private renderer: Renderer2) {
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
            take(1),)
            .subscribe(data => {

                this.authData = data;
                let companyId = localStorage.getItem('selectedCompanyId');

                if (this.authData.isAuthenticated && companyId) {
                    this.planService.GetActivePlansCount(this.authData.userID, parseInt(companyId))
                        .then(x => {
                            if (x.count >= this.authData.maxPlans)
                                this.canCreateNewPlan = false;
                        });
                }
            });
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

        this.newPlanDialogOpen$.pipe(
            takeUntil(this.storeUnsubscribe))
            .subscribe(x => this.newPlanDialogOpen = x);
    }

    // Skip button was clicked
    handleSkipClick(): void {

        this.lightDownMainMask();
        this.clearMasks();
        // Show thanks dialog
        this.step = StepType.Thanks;
    }

    // Next button was clicked
    handleNextClick(step: StepType): void {

        this.lightDownMainMask();
        this.clearMasks();
        if (step === StepType.Welcome) {
            // Make mask background lighter
            this.renderer.addClass(this.tourMask.nativeElement, 'tour-mask-light');

            this.step = StepType.MainAreas;
        }
    }

    // Play tour or start own plan button was clicked
    handleFinishClick(finishType: FinishType) {

        if (finishType === FinishType.NewPlan) {

            if (this.authData.isAuthenticated) {
                this.hideTour(() => {
                    this.createNewPlan();
                });
            }
            else
                document.location.href = window["ssoRegisterUrl"];
        }
        // Play with tour
        else {
            this.hideTour(() => {
                this.showDisclaimer();
            });
        }
    }

    // Show disclaimer popup
    private showDisclaimer(): void {
        const creator = this.appComponent;
        if (!creator) return;

        const dialog = <DisclaimerPopup>creator.createDialog(DisclaimerPopup);
        dialog.setTopest(true);
        const x = (document.body.clientWidth - dialog.width) / 2;
        const y = document.body.clientHeight - dialog.height - 30;

        dialog.show(x, y);
    }

    onCreateStandartPlan(callback?: Function): void {
        const creator = this.appComponent;
        if (!creator) return;

        let newplanForm = <NewPlanForm>creator.createDialog(NewPlanForm);
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

    // Show newPlanDialog
    private createNewPlan(): void {

         this.onCreateStandartPlan();

    }

    private hideTour(callback: Function): void {
        // Hide tour
        this.renderer.addClass(this.tourMask.nativeElement, 'tour-hidden');

        // Destroy tour component after it was faded out
        setTimeout(() => {
            appDataActions.setIsTourVisible(false);
            callback();
        }, 300);
    }

    public getTourMaskDom(): Element {

        return this.tourMask.nativeElement;

    }

}
