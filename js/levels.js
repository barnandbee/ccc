// Level layouts. Each level is built with a small set of helpers.
// Grid: 40px tiles, 14 rows (0 = top). Ground is normally rows 12-13, so things
// standing on the ground sit in row 11.
//
// Jump reach: about 3 tiles up and 4 tiles across. Gaps of 8 tiles need a special
// ability (Tim's glide or Rex's sprint).

export const T = 40;
export const ROWS = 14;
export const TILE = { EMPTY: 0, SOLID: 1, ONEWAY: 2, CONV_L: 3, CONV_R: 4, SPIKE: 5, GLOOM: 6 };

class Builder {
  constructor(width) {
    this.width = width;
    this.tiles = new Uint8Array(width * ROWS);
    this.sparks = [];
    this.secrets = [];
    this.checkpoints = [];
    this.enemies = [];
    this.walls = [];
    this.signs = [];
    this.movers = [];
    this.exit = null;
    this.start = null;
    this.boss = null;
  }
  fill(x, y, w, h, v) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < this.width && j >= 0 && j < ROWS) this.tiles[j * this.width + i] = v;
    return this;
  }
  ground(x0, x1, top = 12) { return this.fill(x0, top, x1 - x0 + 1, ROWS - top, TILE.SOLID); }
  block(x, y, w = 1, h = 1) { return this.fill(x, y, w, h, TILE.SOLID); }
  plat(x, y, w) { return this.fill(x, y, w, 1, TILE.ONEWAY); }
  conv(x, y, w, dir) { return this.fill(x, y, w, 1, dir < 0 ? TILE.CONV_L : TILE.CONV_R); }
  spikes(x, y, w) { return this.fill(x, y, w, 1, TILE.SPIKE); }
  wall(x, y, h) { this.walls.push({ x, y, h }); return this.fill(x, y, 1, h, TILE.GLOOM); }
  spark(x, y) { this.sparks.push({ x, y }); return this; }
  sparkRow(x, y, n, dx = 1, dy = 0) { for (let i = 0; i < n; i++) this.spark(x + i * dx, y + i * dy); return this; }
  sparkArc(x, y, n, h = 1.5) {
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      this.spark(x + i, y - Math.sin(k * Math.PI) * h);
    }
    return this;
  }
  secret(x, y) { this.secrets.push({ x, y }); return this; }
  cp(x, y = 11) { this.checkpoints.push({ x, y }); return this; }
  enemy(kind, x, y = 11, opts = {}) { this.enemies.push({ kind, x, y, ...opts }); return this; }
  sign(x, text, y = 11) { this.signs.push({ x, y, text }); return this; }
  mover(x, y, w, range, axis = 'x', speed = 1) { this.movers.push({ x, y, w, range, axis, speed }); return this; }
  begin(x, y = 11) { this.start = { x, y }; return this; }
  end(x, y = 11) { this.exit = { x, y }; return this; }
}

function level1() {
  const b = new Builder(180);
  b.ground(0, 28).begin(2);
  b.sign(5, 'Walk with ← → (or the arrow buttons). Collect the stars of Seasonal Spirit!');
  b.sparkRow(7, 11, 4);
  b.sign(12, 'Jump with ↑, Space or the jump button. Hold it to jump higher.');
  b.block(14, 11, 2, 1).sparkRow(14, 10, 2);
  b.block(18, 10, 2, 2).sparkRow(18, 9, 2);
  b.sign(21, "January's sad sprouts! Jump on them to cheer them up.");
  b.enemy('walker', 25);
  b.sparkArc(28, 10, 5, 2);
  b.ground(32, 66);
  b.sign(33, 'You can jump up through tables from below.');
  b.plat(36, 9, 6).sparkRow(36, 8, 6);
  b.plat(43, 6, 4).secret(45, 5);
  b.cp(48);
  b.sign(50, {
    tim: 'Press X (or ★) to throw. Hold jump while falling to glide!',
    rex: 'Press X (or ★) for a Keirin Sprint. It works mid-air too!',
  });
  b.enemy('walker', 52).enemy('walker', 54);
  b.sparkRow(51, 11, 3);
  b.cp(56);
  b.sign(57, {
    tim: 'A gloom wall! Throw three things at it to crack it.',
    rex: 'A gloom wall! Sprint straight into it.',
  });
  b.wall(59, 7, 5);
  b.sign(64, {
    tim: 'Too far to jump. Jump, then hold jump to glide across.',
    rex: 'Too far to jump. Jump, then sprint in mid-air.',
  });
  b.sparkRow(68, 9, 6, 1);
  b.ground(75, 110);
  b.block(80, 10, 3, 2).block(83, 8, 3, 4).sparkRow(83, 7, 3);
  b.enemy('walker', 89).sparkRow(87, 11, 5);
  b.plat(95, 9, 3).plat(99, 6, 3).secret(100, 5).sparkRow(95, 8, 3);
  b.enemy('walker', 105);
  b.ground(111, 117, 13).secret(114, 12).sparkRow(112, 12, 2).sparkRow(115, 12, 2);
  b.ground(118, 149);
  b.cp(122);
  b.sparkRow(124, 11, 5);
  b.enemy('walker', 130).enemy('walker', 136);
  b.block(140, 11, 1, 1).block(141, 10, 1, 2).block(142, 9, 1, 3);
  b.plat(145, 8, 4).sparkRow(145, 7, 4);
  b.ground(154, 179);
  b.sparkRow(156, 11, 6);
  b.sign(162, 'Light the tree to bring back a bit of Christmas!');
  b.end(170);
  return { ...b, id: 1, name: 'Boxing Day Leftovers', theme: 1, paper: '#f6efdf', par: 150, difficulty: 0 };
}

function level2() {
  const b = new Builder(242);
  b.ground(0, 24).begin(2);
  b.sign(4, 'Monday morning. The 07:52 to London Waterloo is delayed. Again.');
  b.sparkRow(6, 11, 4);
  b.enemy('walker', 12);
  b.block(16, 10, 3, 2).sparkRow(16, 9, 3);
  b.sparkArc(24, 10, 6, 2);
  b.ground(29, 60);
  // first train carriage
  b.block(32, 11, 1, 1).block(33, 9, 12, 3).sparkRow(34, 8, 10);
  b.enemy('walker', 38, 8);
  b.enemy('flyer', 42, 5, { range: 3 });
  b.spikes(46, 11, 3).sparkArc(45, 9, 5, 1.5);
  b.cp(50);
  b.enemy('walker', 52);
  b.wall(54, 7, 5);
  b.sparkRow(62, 9, 6);
  b.ground(69, 110);
  // puddle crossed on a floating platform
  b.spikes(72, 11, 7);
  b.mover(72, 9, 3, 4, 'x', 1);
  b.sparkRow(73, 7, 5);
  b.enemy('flyer', 84, 7, { range: 2 });
  b.block(88, 10, 2, 2).block(92, 8, 2, 4).plat(96, 6, 3).secret(97, 5);
  b.cp(100);
  b.enemy('walker', 103).enemy('walker', 107);
  b.sparkArc(110, 10, 6, 2);
  b.ground(115, 150);
  // second carriage with a gloom-locked luggage cupboard
  b.block(118, 11, 1, 1).block(119, 9, 15, 3);
  b.enemy('walker', 123, 8);
  b.enemy('flyer', 126, 5, { range: 2 });
  // cupboard on the carriage roof: jump onto its lid to carry on, or smash in for the treasure
  b.block(131, 6, 3, 1).block(133, 7, 1, 2).wall(131, 7, 2).secret(132, 8);
  b.sparkRow(120, 8, 8);
  b.sign(140, {
    tim: 'Another long gap. Hold jump to glide!',
    rex: 'Another long gap. Sprint in mid-air!',
  });
  b.sparkRow(152, 9, 6);
  b.cp(162);
  b.enemy('flyer', 168, 7, { range: 2 }).enemy('flyer', 176, 6, { range: 3 });
  b.spikes(170, 11, 2);
  b.enemy('walker', 174).enemy('walker', 180);
  b.block(184, 10, 2, 2).plat(187, 7, 2).secret(188, 6);
  b.sparkRow(190, 11, 6);
  b.cp(197);
  b.sign(199, "Something's blocking the platform. Whatever you do, don't give it any attention.");
  // boss arena: the Reindeer Influencer
  b.ground(159, 241);
  b.block(238, 0, 4, 12);
  b.plat(211, 8, 3).plat(226, 8, 3);
  b.end(232);
  b.boss = { type: 'reindeer', x: 228, gateX: 202, triggerX: 206, arenaX0: 202, arenaX1: 238 };
  return { ...b, id: 2, name: 'The Back-to-Work Commute', theme: 2, paper: '#eceeeb', par: 180, difficulty: 1 };
}

function level3() {
  const b = new Builder(222);
  b.ground(0, 30).begin(2);
  b.sign(4, 'The Gym of Resolutions. Everyone here is a New Me.');
  b.conv(8, 12, 6, 1).sparkRow(9, 11, 4);
  b.sign(15, 'Treadmills! This one pushes you backwards.');
  b.conv(17, 12, 7, -1).sparkRow(18, 11, 5);
  b.enemy('walker', 27);
  b.sparkArc(30, 10, 6, 2);
  b.ground(35, 70);
  b.enemy('jumper', 40);
  b.block(44, 10, 2, 2).block(47, 8, 2, 4);
  b.spikes(51, 11, 3);
  b.plat(51, 6, 3).secret(52, 5);
  b.sparkRow(50, 9, 6);
  b.cp(56);
  b.enemy('walker', 59);
  b.wall(62, 7, 5);
  b.enemy('jumper', 66);
  b.sparkRow(72, 9, 6);
  b.ground(79, 120);
  // lift up the tower
  b.sign(81, 'Ride the lift to the top!');
  b.mover(84, 11, 3, 7, 'y', 0.8);
  b.block(87, 4, 6, 8).secret(90, 3).sparkRow(87, 3, 3).sparkRow(91, 3, 2);
  b.enemy('flyer', 97, 5, { range: 2 });
  b.spikes(96, 11, 3);
  b.enemy('walker', 101).enemy('walker', 105).enemy('jumper', 109);
  b.cp(112);
  b.conv(114, 12, 7, -1).enemy('jumper', 117);
  b.sparkArc(120, 10, 6, 2);
  b.ground(125, 170);
  b.plat(128, 9, 3).plat(132, 7, 3).plat(136, 5, 3).secret(137, 4);
  b.sparkRow(128, 8, 3).sparkRow(132, 6, 3);
  b.enemy('walker', 142).enemy('jumper', 148).enemy('flyer', 152, 6, { range: 3 });
  b.spikes(155, 11, 3);
  b.cp(160);
  b.enemy('walker', 165);
  b.sparkRow(172, 9, 6);
  b.ground(179, 221);
  b.spikes(185, 11, 2);
  b.enemy('walker', 190).enemy('walker', 196).enemy('jumper', 200).enemy('flyer', 205, 6, { range: 2 });
  b.sparkRow(188, 11, 3).sparkRow(198, 9, 4);
  b.end(214);
  return { ...b, id: 3, name: 'The Gym of Resolutions', theme: 3, paper: '#f5eee2', par: 200, difficulty: 2 };
}

function level4() {
  const b = new Builder(166);
  b.ground(0, 30).begin(2);
  b.sign(4, "Blue Monday's Tax Office. Please take a ticket.");
  b.enemy('walker', 10).enemy('flyer', 14, 7, { range: 3 }).enemy('walker', 16);
  b.sparkRow(6, 11, 3);
  b.block(20, 10, 2, 2).block(23, 8, 2, 4);
  b.spikes(25, 11, 4).sparkArc(25, 8, 4, 1);
  b.sparkArc(31, 10, 4, 2);
  b.ground(35, 66);
  b.block(38, 9, 2, 3).block(44, 9, 2, 3).enemy('jumper', 41);
  b.plat(40, 6, 3).secret(41, 5);
  b.enemy('flyer', 48, 6, { range: 2 }).enemy('flyer', 54, 7, { range: 2 });
  b.sparkRow(47, 11, 6);
  b.cp(56);
  b.wall(60, 7, 5);
  b.sparkRow(68, 9, 6);
  b.ground(75, 95);
  b.enemy('walker', 80).enemy('walker', 86);
  b.spikes(90, 11, 3).enemy('flyer', 92, 6, { range: 2 });
  b.mover(96, 9, 3, 4, 'x', 1.1).secret(100, 7);
  b.ground(104, 128);
  b.cp(107);
  b.enemy('walker', 111).enemy('jumper', 114).enemy('flyer', 120, 6, { range: 2 });
  b.block(115, 10, 2, 2).plat(118, 7, 3).secret(119, 6);
  b.sparkRow(122, 11, 4);
  b.sparkRow(82, 11, 4).sparkRow(105, 11, 2).sparkRow(39, 8, 6).sparkRow(10, 9, 3);
  b.cp(126);
  b.sign(128, 'Now serving: ticket 001. Blue Monday will see you now.');
  // boss arena
  b.ground(129, 165);
  b.block(162, 0, 4, 12);
  b.plat(138, 8, 4).plat(151, 8, 4);
  b.end(156);
  b.boss = { type: 'monday', x: 152, gateX: 131, triggerX: 135, arenaX0: 131, arenaX1: 162 };
  return { ...b, id: 4, name: "Blue Monday's Tax Office", theme: 4, paper: '#e3d1b0', par: 220, difficulty: 3 };
}

export const LEVELS = [level1(), level2(), level3(), level4()];
