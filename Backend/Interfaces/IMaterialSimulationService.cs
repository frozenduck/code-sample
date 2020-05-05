using Interfaces.PersonalFiles.Model;
using Interfaces.Data.Faults;
using Interfaces.Security.Permissions.Faults;
using System;
using System.Collections.Generic;
using System.ServiceModel;
using System.Threading.Tasks;

namespace Interfaces.PersonalFiles.Services
{
    [ServiceContract]
    public interface IMaterialStimulationService
    {
        [OperationContract]
        [FaultContract(typeof(OperationAccessDeniedFault))]
        IList<MaterialStimulationDto> GetList(Guid personalFileId);

        [FaultContract(typeof(EntityNotFoundFault))]
        [FaultContract(typeof(OperationAccessDeniedFault))]
        [OperationContract]
        Task<MaterialStimulationDto> SaveAsync(MaterialStimulationDto dto);

        [FaultContract(typeof(EntityNotFoundFault))]
        [FaultContract(typeof(OperationAccessDeniedFault))]
        [OperationContract]
        Task DeleteAsync(Guid id);
    }
}
