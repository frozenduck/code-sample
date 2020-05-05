;
(function (module) {

    module.controller('MaterialStimulationListController', ['$scope', '$stateParams', 'emptyGuid', 'HTTP_STATUS_CODES', 'dialogService', 'materialStimulationService', 'options', 'model', 'Classifier', 'salaryCalculator',
        function ($scope, $stateParams, emptyGuid, HTTP_STATUS_CODES, dialogService, lumpSumPaymentService, options, model, Classifier, salaryCalculator) {

            angular.extend($scope.options, options);
            $scope.total = 0;

            $scope.errors = [];

            $scope.clearErrors = function () {
                $scope.errors = [];
            };

            $scope.salaryTypeSelect2 = Classifier.select2.materialStimulationSalaryTypeForPersonalFile($stateParams.personalFileId);
            $scope.salaryTypeSelect2.allowClear = true;

            $scope.model = model;
            $scope.editModel = null;
            $scope.editedDay = {};
            $scope.current = null;

            $scope.checkedDay = null;

            $scope.select = function (item) {
                $scope.current = item;
            }

            $scope.add = function () {
                $scope.editModel = {
                    id: emptyGuid,
                    personalFileId: $stateParams.personalFileId,

                };
            }

            $scope.canAdd = function () {
                return $scope.editModel === null;
            }

            $scope.canEdit = function () {
                return $scope.current && $scope.editModel === null;
            }

            $scope.edit = function () {
                $scope.editModel = angular.copy($scope.current);
            }

            $scope.canRemove = function () {
                return $scope.current && $scope.editModel === null;
            }

            $scope.remove = function () {
                dialogService.confirm('Удалить элемент?').ok(function () {

                    $scope.notification.clear();
                    $scope.beginLongOperation();

                    var operation = lumpSumPaymentService.remove($scope.current.id);

                    operation.success(function () {
                        $scope.model.remove($scope.current);
                        $scope.current = null;
                        $scope.endLongOperation();
                    });

                    operation.error(function () {
                        $scope.notification.error('При удалении произошла ошибка.');
                    });

                    operation['finally'] = function () {
                        recalculateTotal();
                        $scope.endLongOperation();
                    };
                });
            }

            $scope.save = function () {
                $scope.notification.clear();
                $scope.clearErrors();

                $scope.beginLongOperation();

                var operation = lumpSumPaymentService.save($scope.editModel);
                operation.success(function (result) {

                    if ($scope.editModel.id === emptyGuid)
                        $scope.model.push(result);
                    else
                        angular.copy(result, $scope.current);

                    $scope.editModel = null;
                    $scope.current = null;
                });

                operation.error(function (response) {
                    switch (response.status) {
                        case HTTP_STATUS_CODES.BAD_REQUEST:
                            $scope.errors = response.data;
                            break;
                        case HTTP_STATUS_CODES.FORBIDDEN:
                            $scope.errors = ['Недостаточно прав для выполнения операции.'];
                            break;
                        default:
                            $scope.errors = ['При сохранении произошла ошибка.'];
                    }
                });

                operation['finally'](function () {
                    recalculateTotal();
                    $scope.endLongOperation();
                });
            }

            function recalculateTotal() {
                $scope.total = salaryCalculator.getTotal($scope.model, false);
            };

            recalculateTotal();

            $scope.cancel = function () {
                $scope.editModel = null;
                $scope.current = null;
            }
        }]);
})(appModules.personalFile);