using Common.Data.Models.Classifiers;
using Common.Data.Models.Orders;
using Common.Interfaces.Orders;
using Data.Models.Applicant;
using Framework.Data.Entities;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration;

namespace Data.Models.Orders
{
    public class MaterialStimulation : Order
    {
        public MaterialStimulation()
        {
            Type = OrderType.MaterialStimulation;
        }

        public Guid PersonalFileId { get; set; }
        public PersonalFile PersonalFile { get; set; }

        public Guid SalaryTypeId { get; set; }
        public SalaryType SalaryType { get; set; }

        public DateTime DateStart { get; set; }
        public DateTime? DateEnd { get; set; }
        public decimal SalaryValue { get; set; }

        public class Map : EntityTypeConfiguration<MaterialStimulation>, IMappingBuilder
        {
            public Map()
            {
                ToTable("MaterialStimulations", "Order");

                HasRequired(x => x.PersonalFile).WithMany().HasForeignKey(x => x.PersonalFileId);
                HasRequired(x => x.SalaryType).WithMany().HasForeignKey(x => x.SalaryTypeId);
            }

            public void Build(DbModelBuilder builder)
            {
                builder.Configurations.Add(this);
            }
        }
    }
}
