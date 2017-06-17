export function tagsToJson(tags: any): string[] {
  var tagsJson = [];
  for (var tag in tags)
    tagsJson.push(tags[tag].text);
  return tagsJson;
};
