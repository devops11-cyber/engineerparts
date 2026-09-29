export function img(id: string, w = 1200, h = 900): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export function src(idOrUrl: string, w = 1200, h = 900): string {
  if (idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://")) return idOrUrl;
  return img(idOrUrl, w, h);
}

export const photo = {
  warehouseWide: "1553413077-190dd305871c",
  warehouseAisle: "1601598851547-4302969d0614",
  warehouseShelves: "1586528116311-ad8dd3c8310d",
  warehouseRacks: "1487875961445-47a00398c267",
  factoryFloor: "1504328345606-18bbc8c9d7d1",
  pipesStack: "1590959651373-a3db0f38a961",
  pipesIndustrial: "1518709268805-4e9042af9f23",
  pipesRow: "1565043666747-69f6646db940",
  engineerBench: "1581092160562-40aa08e78837",
  engineerPanel: "1581094794329-c8112a89af12",
  engineerTools: "1581092335397-9583eb92d232",
  labInstruments: "1581092918056-0c4c3acd3789",
  instrumentRack: "1581093588401-fbb62a02f120",
  controlPanel: "1581092446327-9b52bd1570c2",
  circuitBoard: "1601972602288-3be527b4f18a",
  toolsWorkshop: "1581091226825-a6a2a5aee158",
  workerPlant: "1621905251189-08b45d6a269e",
  projectorScreen: "1478720568477-152d9b164e26",
  avDesk: "1517077304055-6e89abbf09b0",
  steelCoils: "1541888946425-d81bb19240f5",
  forklift: "1610647752706-3bb12232b3ab",
  palletStock: "1567789884554-0b844b597180",
  machineShop: "1581093450021-4a7360e9a6b5",
  gauges: "1595079676339-1534801ad6cf",
  handTools: "1521790361543-f645cf042ec4",
  electronicsBench: "1531297484001-80022131f5a1",
} as const;
