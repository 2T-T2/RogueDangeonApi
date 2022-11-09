type Coord = {
  x: number;
  y: number;
}

class Random {
  private x = 31415926535;
  private y = 8979323846;
  private z = 2643383279;
  private w: number;

  constructor(seed: number) {
    this.x = 31415926535;
    this.y = 8979323846;
    this.z = 2643383279;
    this.w = seed;
  }
  public next() :number {
    const t = this.x ^ (this.x << 11);
    this.x = this.y; this.y = this.z; this.z = this.w;
    return Math.abs(this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8))); 
  }
  public nextInt(min = -2147483648, max = 2147483648) :number {
    return min + (this.next() % (max + 1 - min));
  }
}

class Room {
  public static readonly MIN = 5;
  public static readonly NO_DOOR: number = -1;
  public readonly top: number;
  public readonly left: number;
  public readonly width: number;
  public readonly height: number;
  public readonly section: Section;
  private readonly door: number[];

  constructor(builder: RoomBuilder) {
    this.top = builder.top;
    this.left = builder.left;
    this.width = builder.width;
    this.height = builder.height;
    this.section = builder.section;
    this.door = builder.door;
  }

  public hasDoor(face: number): boolean {
    return this.door[Section.GetFaceBitFlagIndex(face)] != Room.NO_DOOR;
  }
  public getDoorPos(face: number): number {
    return this.door[Section.GetFaceBitFlagIndex(face)];
  }

  public getBottom(): number {
    return this.top + this.height;
  }

  public getRight(): number {
    return this.left + this.width;
  }
}

class RoomBuilder {
  public readonly top: number;
  public readonly left: number;
  public readonly width: number;
  public readonly height: number;
  public readonly section: Section;
  public readonly door: number[];

  constructor(top: number, left: number, width: number, height: number, section: Section) {
    this.top = top;
    this.left = left;
    this.width = width;
    this.height = height;
    this.section = section;
    this.door = new Array<number>(4).fill(Room.NO_DOOR);
  }

  public addDoor(face: number, pos: number): RoomBuilder {
    this.door[Section.GetFaceBitFlagIndex(face)] = pos;
    return this;
  }

  public build(): Room {
    return new Room(this);
  }
}

class Cove {
  public static readonly DIRECTION_V = 1;
  public static readonly DIRECTION_H = 2;

  public readonly left: number;
  public readonly top: number;
  public readonly right: number;
  public readonly bottom: number;
  public readonly direction: number;

  constructor(fromX: number, fromY: number, direction: number, len: number) {
    if (direction == Cove.DIRECTION_H) {
      this.left = Math.min(fromX + len, fromX);
      this.top = fromY;
      this.right = Math.max(fromX + len, fromX);
      this.bottom = fromY;
      this.direction = direction;
    } else {
      this.left = fromX;
      this.top = Math.min(fromY, fromY + len);
      this.right = fromX;
      this.bottom = Math.max(fromY, fromY + len);
      this.direction = direction;
    }
  }
  public getCoord(): Coord[] {
    const coords = new Array<Coord>(0);
    if(this.direction === Cove.DIRECTION_H)
      for(let x = this.left; x < this.right; x++)
        coords.push({x, y: this.bottom});
    else
      for(let y = this.top; y < this.bottom; y++)
        coords.push({x: this.right, y});
    return coords;
  }
}

class Section {
  public static readonly FACE_NONE = 0;
  public static readonly FACE_TOP = 1 << 0;
  public static readonly FACE_LEFT = 1 << 1;
  public static readonly FACE_RIGHT = 1 << 2;
  public static readonly FACE_BOTTOM = 1 << 3;

  public readonly left: number;
  public readonly top: number;
  public readonly width: number;
  public readonly height: number;
  public readonly face: number;
  public readonly parent: Section | null;

  constructor(left: number, top: number, width: number, height: number, face: number, parent: Section | null) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.face = face;
    this.parent = parent;
  }

  public getRight(): number {
    return this.left + this.width;
  }
  public getBottom(): number {
    return this.top + this.height;
  }
  public getArea(): number {
    return this.width * this.height;
  }

  public static GetFaceBitFlagIndex(face: number): number {
    return Math.floor((Math.log(face) / Math.log(2)));
  }
}

type DividedSection = [Section, Section];

export class Rogue {
  public static readonly BLANK = ' '.charCodeAt(0);
  public static readonly FLOOR = '.'.charCodeAt(0);
  public static readonly COVE  = '#'.charCodeAt(0);
  public static readonly VWALL = '|'.charCodeAt(0);
  public static readonly HWALL = '-'.charCodeAt(0);
  public static readonly DOOR  = '+'.charCodeAt(0);

  private static readonly TMP = 'T'.charCodeAt(0);

  private readonly mesh: number[];
  private readonly rooms: Room[];
  private coves: Cove[];
  private sections: Section[];
  private width: number;
  private height: number;
  private r: Random;

  constructor(width: number, height: number, room_num: number, rand_seed: number | undefined | null) {
    this.mesh = new Array<number>(width * height).fill(Rogue.BLANK);
    this.width = width;
    this.height = height;
    this.sections = [];
    this.coves = [];
    this.r = new Random(rand_seed ? rand_seed : Date.now());
    this.rooms = this.createRooms(room_num);

    for (const room of this.rooms) {
      this.putRoom(room);
      this.putTempCove(room);
    }
    for (const room1 of this.rooms) {
      if (room1.hasDoor(Section.FACE_LEFT))
        this.coves.push(new Cove(room1.left, room1.getDoorPos(Section.FACE_LEFT), Cove.DIRECTION_H, room1.section.left - room1.left));
      if (room1.hasDoor(Section.FACE_RIGHT))
        this.coves.push(new Cove(room1.getRight(), room1.getDoorPos(Section.FACE_RIGHT), Cove.DIRECTION_H, room1.section.getRight() - room1.getRight()));
      if (room1.hasDoor(Section.FACE_TOP))
        this.coves.push(new Cove(room1.getDoorPos(Section.FACE_TOP), room1.section.top, Cove.DIRECTION_V, room1.top - room1.section.top));
      if (room1.hasDoor(Section.FACE_BOTTOM))
        this.coves.push(new Cove(room1.getDoorPos(Section.FACE_BOTTOM), room1.getBottom(), Cove.DIRECTION_V, room1.section.getBottom() - room1.getBottom()));
    }

    for (const cove of this.coves)
      this.putCove(cove);
    for (const section1 of this.sections)
      for (const section2 of this.sections)
        this.makeCove(section1, section2);

    for (const cove of this.coves)
      this.putCove(cove);

    this.deleteTempCove();
  }

  private deleteTempCove(): void {
    for (let i = 0; i < this.mesh.length; i++)
      if (this.mesh[i] == Rogue.TMP) this.mesh[i] = Rogue.BLANK;
  }

  private makeCove(a: Section, b: Section): void {
    if (a.parent === null || b.parent === null || a === b) return;
    if (a.parent === b.parent) {
      let fromY = -1;
      for (let y = a.top; y < a.getBottom(); y++)
        if (this.mesh[a.left + y * this.width] == Rogue.COVE)
          if (fromY == -1) fromY = y;
          else this.coves.push(new Cove(a.left, fromY, Cove.DIRECTION_V, y - fromY));
      let fromX = -1;
      for (let x = a.left; x < a.getRight(); x++)
        if (this.mesh[x + (a.top) * this.width] == Rogue.COVE)
          if (fromX == -1) fromX = x;
          else this.coves.push(new Cove(fromX, a.top, Cove.DIRECTION_H, x - fromX));
    }
  }


  private putCove(cove: Cove): void {
    for (const coord of cove.getCoord()) {
      this.mesh[coord.x + coord.y * this.width] = Rogue.COVE;
    }
  }

  private putRoom(room: Room) {
    for (let x = room.left; x < room.getRight(); x++) {
      for (let y = room.top; y < room.getBottom(); y++) {
        if (x == room.left || x == room.getRight() - 1)
          this.mesh[x + y * this.width] = Rogue.VWALL;
        else if (y == room.top || y == room.getBottom() - 1)
          this.mesh[x + y * this.width] = Rogue.HWALL;
        else
          this.mesh[x + y * this.width] = Rogue.FLOOR;
      }
    }
    if (room.hasDoor(Section.FACE_RIGHT))
      this.mesh[room.getRight() - 1 + room.getDoorPos(Section.FACE_RIGHT) * this.width] = Rogue.DOOR;
    if (room.hasDoor(Section.FACE_LEFT))
      this.mesh[room.left + room.getDoorPos(Section.FACE_LEFT) * this.width] = Rogue.DOOR;
    if (room.hasDoor(Section.FACE_TOP))
      this.mesh[room.getDoorPos(Section.FACE_TOP) + room.top * this.width] = Rogue.DOOR;
    if (room.hasDoor(Section.FACE_BOTTOM))
      this.mesh[room.getDoorPos(Section.FACE_BOTTOM) + (room.getBottom() - 1) * this.width] = Rogue.DOOR;
  }
  private putTempCove(room: Room) {
    for (let x = room.section.left; x < room.section.getRight(); x++) {
      for (let y = room.section.top; y < room.section.getBottom(); y++)
        if (x == room.section.left || x == room.section.getRight() - 1 || y == room.section.top || y == room.section.getBottom() - 1)
          this.mesh[x + y * this.width] = Rogue.TMP;
    }
    if (room.hasDoor(Section.FACE_RIGHT)) {
      const y = room.getDoorPos(Section.FACE_RIGHT);
      for (let x = room.getRight(); this.mesh[x + y * this.width] != Rogue.TMP; x++)
        this.mesh[x + y * this.width] = Rogue.TMP;
    }
    if (room.hasDoor(Section.FACE_LEFT)) {
      const y = room.getDoorPos(Section.FACE_LEFT);
      for (let x = room.left - 1; this.mesh[x + y * this.width] != Rogue.TMP; x--)
        this.mesh[x + y * this.width] = Rogue.TMP;
    }
    if (room.hasDoor(Section.FACE_BOTTOM)) {
      const x = room.getDoorPos(Section.FACE_BOTTOM);
      for (let y = room.getBottom(); this.mesh[x + y * this.width] != Rogue.TMP; y++)
        this.mesh[x + y * this.width] = Rogue.TMP;
    }
    if (room.hasDoor(Section.FACE_TOP)) {
      const x = room.getDoorPos(Section.FACE_TOP);
      for (let y = room.top - 1; this.mesh[x + y * this.width] != Rogue.TMP; y--)
        this.mesh[x + y * this.width] = Rogue.TMP;
    }
  }

  private createRooms(room_num: number): Room[] {
    const rooms = new Array<Room>(room_num);
    const tmp = new Array<Section>(0);
    tmp.push(new Section(0, 0, this.width, this.height, Section.FACE_NONE, null));
    for (let i = 0; i < room_num - 1; i++) {
      this.divide(tmp);
    }
    for (let i = 0; i < room_num; i++)
      rooms[i] = this.createRoomInFitTo(tmp[i]);

    this.sections = this.sections.concat(tmp);
    return rooms;
  }

  private createRoomInFitTo(section: Section): Room {
    let a = 0, b = 0;
    while (Math.abs(a - b) < Room.MIN) {
      a = this.r.nextInt(section.left + 1, section.getRight() - 1);// this.randBetween(section.left + 1, section.getRight() - 1);
      b = this.r.nextInt(section.left + 1, section.getRight() - 1);// this.randBetween(section.left + 1, section.getRight() - 1);
    }
    let c = a, d = b;
    const x = Math.min(c, d);
    const w = Math.max(c, d) - x;

    a = 0;
    b = 0;
    while (Math.abs(a - b) < Room.MIN) {
      a = this.r.nextInt(section.top + 1, section.getBottom() - 1);// this.randBetween(section.top + 1, section.getBottom() - 1);
      b = this.r.nextInt(section.top + 1, section.getBottom() - 1);// this.randBetween(section.top + 1, section.getBottom() - 1);
    }
    c = a;
    d = b;
    const y = Math.min(c, d);
    const h = Math.max(c, d) - y;

    const builder = new RoomBuilder(y, x, w, h, section);
    if ((section.face & Section.FACE_RIGHT) != 0)
      builder.addDoor(Section.FACE_RIGHT, this.r.nextInt(y + 1, y + h - 2));
      // builder.addDoor(Section.FACE_RIGHT, this.randBetween(y + 1, y + h - 2));
    if ((section.face & Section.FACE_LEFT) != 0)
      builder.addDoor(Section.FACE_LEFT, this.r.nextInt(y + 1, y + h - 2));
      // builder.addDoor(Section.FACE_LEFT, this.randBetween(y + 1, y + h - 2));
    if ((section.face & Section.FACE_BOTTOM) != 0)
      builder.addDoor(Section.FACE_BOTTOM, this.r.nextInt(x + 1, x + w - 2));
      // builder.addDoor(Section.FACE_BOTTOM, this.randBetween(x + 1, x + w - 2));
    if ((section.face & Section.FACE_TOP) != 0)
      builder.addDoor(Section.FACE_TOP, this.r.nextInt(x + 1, x + w - 2));
      // builder.addDoor(Section.FACE_TOP, this.randBetween(x + 1, x + w - 2));

    return builder.build();
  }

  private divide(sections: Section[]): void {
    const r = sections.sort((a, b) => b.getArea() - a.getArea())[0];
    if (r.width > r.height) {
      const a = this.vDivide(r);
      sections.push(a[0]);
      sections.push(a[1]);
    } else {
      const a = this.hDivide(r);
      sections.push(a[0]);
      sections.push(a[1]);
    }
    for (let i = 0; i < sections.length; i++) {
      if (sections[i] === r) {
        sections.splice(i, 1);
        break;
      }
    }
    this.sections.push(r);
  }

  private vDivide(p: Section): DividedSection {
    // const d = this.randBetween(Room.MIN + 3, p.width - (Room.MIN + 3));
    const d = this.r.nextInt(Room.MIN + 3, p.width - (Room.MIN + 3));
    const c1 = new Section(p.left, p.top, d, p.height, p.face | Section.FACE_RIGHT, p);
    const c2 = new Section(c1.getRight() - 1, p.top, p.width - d + 1, p.height, p.face | Section.FACE_LEFT, p);
    return [c1, c2];
  }
  private hDivide(p: Section): DividedSection {
    // const d = this.randBetween(Room.MIN + 3, p.height - (Room.MIN + 3));
    const d = this.r.nextInt(Room.MIN + 3, p.height - (Room.MIN + 3));
    const c1 = new Section(p.left, p.top, p.width, d, p.face | Section.FACE_BOTTOM, p);
    const c2 = new Section(p.left, c1.getBottom() - 1, p.width, p.height - d + 1, p.face | Section.FACE_TOP, p);
    return [c1, c2];
  }

  // private randBetween(min: number, max: number): number {
  //   return Math.floor(Math.random() * (max - min + 1) + min);
  // }
}
