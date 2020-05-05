using System.Runtime.Serialization;

using Common.Interfaces.Shared.Filter;
using Interfaces.Data;

namespace Quarta.EisUks.Interfaces.TimeSheet.Models
{
    [DataContract]
    public class MaterialStimulationListModel
    {
        [DataMember]
        public FilterModel Filter { get; set; }

        [DataMember]
        public PagedResult<MaterialStimulationItemDto> Result { get; set; }
    }
}
