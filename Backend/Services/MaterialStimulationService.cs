using JetBrains.Annotations;
using Interfaces.PersonalFiles.Services;
using Framework.Data.Operations;
using Framework.Security;
using ServiceModel.Services;
using System;
using System.Linq;
using System.Data;
using System.Data.Entity;
using System.ServiceModel;
using System.Threading.Tasks;
using Interfaces.PersonalFiles.Model;
using Data.Models.Orders;
using Interfaces.Data.Faults;
using Framework.Data.Entities;
using Common.Data.Models.Orders;
using SystemServices.Data.Binders;
using Data.Models.Applicant;
using Core.PersonalFiles.Permissions;
using Services.Data.Filters;
using System.Collections.Generic;
using Common.Interfaces.Classifier.Data;
using Interfaces.Data;

namespace Core.PersonalFiles.Services
{
    [ErrorHandlerBehavior]
    [ServiceBehavior(ConcurrencyMode = ConcurrencyMode.Multiple, InstanceContextMode = InstanceContextMode.PerSession)]
    public class MaterialStimulationService : IMaterialStimulationService
    {
        private readonly IUser _user;
        private readonly IOperationContextFactory _dbFactory;
        private readonly IEntityBinderFactory _binderFactory;


        public MaterialStimulationService(IUser user, 
                                         IEntityBinderFactory binderFactory, 
                                         IOperationContextFactory dbFactory)
        {
            _user = user;
            _dbFactory = dbFactory;
            _binderFactory = binderFactory;
        }

        public IList<MaterialStimulationDto> GetList(Guid personalFileId)
        {
            using (var db = _dbFactory.Create(PersonalFilePermissions.ReadOperation))
            {
                var items = db.Set<MaterialStimulation>()
                    .Where(x => x.PersonalFileId == personalFileId && x.RecordDeleted == null)
                    .Select(x => new MaterialStimulationDto
                    {
                        ID = x.ID,
                        OrderDate = x.OrderHead.OrderDate,
                        OrderNumber = x.OrderHead.OrderNumber,
                        PersonalFileId = x.PersonalFileId,

                        DateStart = x.DateStart,
                        DateEnd = x.DateEnd,
                        MustBeNotify = x.MustBeNotify,
                        SalaryType = new SalaryTypeDto
                        {
                            ID = x.SalaryTypeId,
                            Name = x.SalaryType.Name,
                            UnitMeasure = new EnumItemDto
                            {
                                Id = x.SalaryType.UnitMeasure
                            }
                        },
                        Value = x.SalaryValue,
                    })
                    .ToArray();
                
                return items;
            }
        }

        public async Task<MaterialStimulationDto> SaveAsync(MaterialStimulationDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            using (var db = _dbFactory.Create(PersonalFilePermissions.EditOperation))
            {
                var personalFile = db.Set<PersonalFile>().SingleOrDefault(x => x.ID == dto.PersonalFileId);
                MaterialStimulation entity;
                if (dto.ID == Guid.Empty)
                {
                    entity = new MaterialStimulation
                    {
                        ID = Guid.NewGuid(),
                        RecordCreatedByUserID = _user.Id,
                        PersonalFileId = dto.PersonalFileId,
                        OrganizationId = personalFile.OrganizationId,
                    };

                    db.Set<MaterialStimulation>().Add(entity);
                }
                else
                {
                    entity = await db.Set<MaterialStimulation>()
                        .Include(x => x.OrderHead)
                        .SingleOrDefaultAsync(x => x.ID == dto.ID && !x.RecordDeleted.HasValue);

                    if (entity == null)
                        throw EntityNotFoundFault.Create(dto.ID, typeof(MaterialStimulation));

                    entity.RecordLastModifiedByUserID = _user.Id;
                    entity.RecordLastModified = DateTime.Now;
                }

                if (entity.OrderHead == null)
                {
                    entity.OrderHead = new OrderHead();
                    entity.RecordCreatedByUserID = _user.Id;

                    entity.OrderHead.OrderDate = dto.OrderDate;
                    entity.OrderHead.OrderNumber = dto.OrderNumber;
                    entity.OrderHead.OrganizationId = personalFile.OrganizationId;
                }
                else if (entity.OrderHead.OrderDate != dto.OrderDate 
                        || entity.OrderHead.OrderNumber != dto.OrderNumber)
                {
                    entity.OrderHead.OrderDate = dto.OrderDate;
                    entity.OrderHead.OrderNumber = dto.OrderNumber;

                    entity.OrderHead.RecordLastModified = DateTime.Now;
                    entity.OrderHead.RecordLastModifiedByUserID = _user.Id;
                }

                var binder = _binderFactory.Create<MaterialStimulation, MaterialStimulationDto>(db);
                entity = binder.BindFrom(entity, dto);

                await db.SaveChangesAsync();

                dto.ID = entity.ID;

                return dto;
            }
        }

        public async Task DeleteAsync(Guid id)
        {
            using (var db = _dbFactory.Create(PersonalFilePermissions.EditOperation))
            {
                var entity = await db.Set<MaterialStimulation>()
                   .Where(x => x.ID == id && !x.RecordDeleted.HasValue)
                   .SingleOrDefaultAsync()
                   .ConfigureAwait(false);

                if (entity == null)
                    throw EntityNotFoundFault.Create(id, typeof(MaterialStimulation));

                entity.RecordDeleted = DateTime.Now;
                entity.RecordDeletedByUserID = _user.Id;

                await db.SaveChangesAsync().ConfigureAwait(false);
            }
        }
    }
}
