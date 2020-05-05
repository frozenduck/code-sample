;
(function (module) {
    "use strict";
    module.service('materialStimulationService', ['httpService', function (httpService) {

        var resource = '/api/personalfile/material-stimulation/';
        var url = function (action) {
            return resource + action;
        };

        var svc = {};

        svc.getList = function (personalFileId) {
            return httpService.get(url('getList'), { params: { personalFileId: personalFileId } });
        };

        svc.save = function (model) {
            return httpService.post(url('save'), model);
        };

        svc.remove = function (id) {
            return httpService.post(url('remove'), null, { params: { id: id } });
        }

        return svc;
    }]);
})(appModules.personalFile);