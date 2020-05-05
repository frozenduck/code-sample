using FluentValidation;
using Interfaces.PersonalFiles.Model;
using System;
using System.Linq;

namespace Web.Areas.PersonalData.Validation
{
    public class MaterialStimulationValidator : AbstractValidator<MaterialStimulationDto>
    {
        public MaterialStimulationValidator()
        {
            RuleFor(x => x.SalaryType).NotNull().WithName("Тип денежного содержания");
            RuleFor(x => x.DateStart).NotEmpty().WithName("Дата с");
        }
    }
}