using Common.Interfaces.Classifier.Commands;
using Interfaces.Classifier.MonetaryMaintenance.Queries;
using Interfaces.Classifier.MonetaryMaintenance.Services;
using Interfaces.PersonalFiles.Commands;
using Interfaces.PersonalFiles.Model;
using Interfaces.PersonalFiles.Services;
using Web.Areas.PersonalData.Validation;
using Web.Http.Filters;
using Web.Validation;
using ServiceModel;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;

namespace Web.Areas.PersonalData.Controllers.Api.PersonalFile
{
    public class MaterialStimulationApiController : ApiController
    {
        private readonly IServiceContext<IMaterialStimulationService> _service;
        private readonly IServiceContext<IMonetaryMaintenanceService> _monetaryMaintenanceService;

        public MaterialStimulationApiController(IServiceContext<IMaterialStimulationService> service, IServiceContext<IMonetaryMaintenanceService> monetaryMaintenanceService)
        {
            _service = service;
            _monetaryMaintenanceService = monetaryMaintenanceService;
        }

        [HttpGet]
        [HttpPermissionAuthorize(PersonalFileCommands.Read)]
        public IHttpActionResult GetList(Guid personalFileId)
        {
            var result = _service.Call(s => s.GetList(personalFileId));
            return Ok(result);
        }


        [HttpPost]
        [HttpPermissionAuthorize(PersonalFileCommands.Edit)]
        public async Task<IHttpActionResult> Save([StrongValidator(typeof(MaterialStimulationValidator))] MaterialStimulationDto dto)
        {
            var result = await _service.CallAsync(s => s.SaveAsync(dto));
            return Ok(result);
        }

        [HttpPost]
        [HttpPermissionAuthorize(PersonalFileCommands.Edit)]
        public async Task<IHttpActionResult> Remove(Guid id)
        {
            await _service.CallAsync(s => s.DeleteAsync(id));
            return Ok();
        }

        [HttpGet]
        [HttpPermissionAuthorize(SalaryTypeCommands.Get)]
        public async Task<IHttpActionResult> SalaryTypeForPersonalFile(Guid personalFileId, string q = null)
        {
            var query = new SalaryTypeListQuery
            {
                PersonalFileId = personalFileId,
                Query = q
            };

            var salaryTypeDtos = await _monetaryMaintenanceService.CallAsync(ss => ss.SalaryTypeListAsync(query));
            return Ok(salaryTypeDtos.Items.Select(mm => new
            {
                mm.ID,
                Name = $"{mm.Name} ({mm.UnitMeasure.Name})",
                UnitMeasure = new { Id = mm.UnitMeasure.Id }
            }));
        }

    }
}
