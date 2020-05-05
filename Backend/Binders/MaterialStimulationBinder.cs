using Common.Core.Classifier;
using Data.Models.Orders;
using Interfaces.PersonalFiles.Model;
using SystemServices.Data.Binders;
using System;

namespace Core.PersonalFiles.Binders
{
    public class MaterialStimulationBinder : CommonEntryEntityBinder<MaterialStimulation, MaterialStimulationDto>
    {
        public MaterialStimulationBinder(IEntityBinderFactory factory, IBinderExpressionCache cache) : base(factory, cache) { }

        protected override MaterialStimulationDto BindTo(MaterialStimulation entity, MaterialStimulationDto dto)
        {
            dto.ID = entity.ID;
            dto.PersonalFileId = entity.PersonalFileId ;

            return dto;
        }

        protected override MaterialStimulation BindFrom(MaterialStimulation entity, MaterialStimulationDto dto)
        {
            entity.PersonalFileId = dto.PersonalFileId;

            entity.SalaryTypeId = dto.SalaryType.ID;
            entity.DateStart = dto.DateStart.Value;
            entity.DateEnd = dto.DateEnd;
            entity.SalaryValue = dto.Value ?? 0;

            return entity;
        }
    }
}
