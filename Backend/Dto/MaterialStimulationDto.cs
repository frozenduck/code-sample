using Common.Interfaces.Classifier.Data;
using Common.Interfaces.Entities;
using Interfaces.Salary.Model;
using System;
using System.Runtime.Serialization;

namespace Interfaces.PersonalFiles.Model
{
    [DataContract]
    public class MaterialStimulationDto : CommonEntryDto, ISalaryItem
    {
        [DataMember]
        public string OrderNumber { get; set; }

        [DataMember]
        public DateTime? OrderDate { get; set; }

        [DataMember]
        public SalaryTypeDto SalaryType { get; set; }

        [DataMember]
        public DateTime? DateStart { get; set; }

        [DataMember]
        public DateTime? DateEnd { get; set; }

        [DataMember]
        public decimal? Value { get; set; }

        [DataMember]
        public Guid PersonalFileId { get; set; }

        [DataMember]
        public bool MustBeNotify { get; set; }
    }
}
