/**
 * Migrate any formdata from "data" to "system" since Foundry was doing this prior to v12
 * @param updateData
 * @returns {*}
 */
export function migrateDataToSystem(updateData) {
  if (Object.keys(updateData).includes('data')) {
    if (Object.keys(updateData).includes('system')) {
      updateData.system = foundry.utils.mergeObject(
          updateData.system,
          updateData.data,
      );
    } else {
      updateData.system = updateData.data;
    }
    delete updateData.data;
  }
  for (const curKey of Object.keys(updateData)) {
    if (curKey.includes('data.')) {
      updateData[curKey.replace('data.', 'system.')] = updateData[curKey];
      delete updateData[curKey];
    }
  }
  return updateData;
}
