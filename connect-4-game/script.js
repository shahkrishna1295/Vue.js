const range = num => [...Array(num).keys()];

const key = (row, col) => `${row}${col}`;
const cssUrl = id => `url(#${id})`;
const titleize = text => text[0].toUpperCase() + text.slice(1, text.length);
const min = num => Math.max(num - 3, 0);
const max = (num, max) => Math.min(num + 3, max);

const color1 = 'yellow';
const color2 = 'red';
const EMPTY = 'empty';
const OVER = 'over';
const PLAY = 'play';

//template for board checker (circles)
const BoardChecker = Vue.component('board-checker', {
  template: '#board-checker-template',
  props: ['checker', 'cellSize', 'rowCount', 'checkerRadius', 'status'],

  data() {
    return {
      colorHexes: {
        yellow: '#f0ed35',
        red: '#ff1f1f',
        } };
  },

  computed: {
    row() {return this.checker.row;},
    col() {return this.checker.col;},
    color() {return this.checker.color;},
    isWinner() {return this.checker.isWinner;},

    adjustedColor() {
      return this.colorHexes[this.color];
    },

    opacity() {
      return this.status === OVER && !this.isWinner ? 0.25 : 1.0;
    },

    //x position of the checker
    centerX() {
      return this.cellSize / 2;
    },

    //y position of the checker
    centerY() {
      return this.cellSize / 2 + this.cellSize * (this.rowCount - 1 - this.row);
    },

    fromY() {
      return -1 * (this.centerY + this.cellSize);
    },

    destY() {
      return 0;
    },

    percentage() {
      return (this.rowCount - this.row) / this.rowCount;
    },

    duration() {
      return 0.2 + 0.4 * this.percentage;
    } },

  //method for animation
  methods: {
    enter(el, done) {
      const fromParams = { y: this.fromY };
      const destParams = {
        y: this.destY,
        onComplete: () => {
          this.$emit('land');
          done();
        } };


      return TweenMax.fromTo(el, this.duration, fromParams, destParams);
    } } });


//vue template for the board columns
const BoardColumn = Vue.component('board-column', {
  template: '#board-column-template',
  props: ['checkers', 'col', 'color', 'cellSize', 'boardHeight', 'checkerRadius', 'rowCount', 'mask', 'status'],

  components: {
    BoardChecker },


  computed: {
    // Find the current max occupied row and add 1
    nextOpenRow() {
      return Math.max(...this.checkers.map(c => c.row).concat(-1)) + 1;
    },

    opacity() {
      return this.status === OVER ? 0.2 : 1.0;
    } },

  //limit the drop to the number of checkers in a column
  methods: {
    key({ row, col }) {
      return `${row}${col}`;
    },

    land() {
      this.$emit('land');
    },

    drop(col) {
      const row = this.nextOpenRow;

      if (row < this.rowCount) {
        this.$emit('drop', { row, col });
      } else {
        console.log('cannot drop', { row, col });
      }
    } } });


//container to setup the rows and columns in a box
//defining the dimensions of the board layout
const GameBoard = Vue.component('game-board', {
  template: '#game-board-template',
  props: ['checkers', 'rowCount', 'colCount', 'status'],
  components: {
    BoardColumn },


  data() {
    return {
      patternId: 'cell-pattern',
      maskId: 'cell-mask',
      cellSize: 100 };

  },

  //layout of the board, sizes of the columns, rows and checkers 
  computed: {
    //here mask created checkers
    pattern() {return cssUrl(this.patternId);},
    mask() {return cssUrl(this.maskId);},

    //retuns rows and col numbers
    rows() {return range(this.rowCount);},
    cols() {return range(this.colCount);},

    boardWidth() {return this.colCount * this.cellSize;},
    boardHeight() {return this.rowCount * this.cellSize;},
    checkerRadius() {return this.cellSize * 0.45;} },


  methods: {
    colCheckers(col) {

      //inserting checkers into the column
      return Object.values(this.checkers).filter(c => c.col === col).
      sort((a, b) => a.row - b.row);
    },
    drop(data) {
      this.$emit('drop', data);
    },
    land() {
      this.$emit('land');
    } } });


//the main continer that calls all the data needed to play from other containers
//this renders game board
const GameContainer = Vue.component('game-container', {
  template: "#game-container-template",

  components: {
    GameBoard },


  data() {
    return {
      //object to store the checkers
      checkers: {},
      isLocked: false,
      playerColor: color1,
      rowCount: 6,
      colCount: 7,
      status: PLAY,
      instructions: 'Click columns to add checkers',
      winner: undefined };

  },

  //user messages 
  computed: {
    overMessage() {
      if (this.winner) {
        return `${titleize(this.winner.color)} wins!`;
      } else {
        return `It's a draw!`;
      }
    },

    //informs user the moves
    moves() {
      return Object.values(this.checkers);
    },

    //tells users whos turn is next
    whoseTurn() {
      return `${titleize(this.playerColor)} goes ${this.moves.length === 0 ? 'first' : 'next'}`;
    },

    gameOver() {
      return this.status === OVER;
    } },


  methods: {
    key,

    //resetting the whole game to new game
    reset() {
      this.winner = undefined;
      this.isLocked = false;
      this.status = PLAY;
      this.checkers = {};
    },

    //alternate the colors 
    toggleColor() {
      if (this.playerColor === color1) {
        this.playerColor = color2;
      } else {
        this.playerColor = color1;
      }
    },

    setChecker({ row, col }, attrs = {}) {
      const checker = this.getChecker({ row, col });
      return Vue.set(this.checkers, key(row, col), { ...checker, ...attrs });
    },

    getChecker({ row, col }) {
      return this.checkers[key(row, col)] || { row, col, color: 'empty' };
    },

    //method for dropping the circles into the checkers
    drop({ col, row }) {
      if (this.isLocked) return;

      this.isLocked = true;
      const color = this.playerColor;

      console.log('setting checker', key(row, col), { row, col, color });
      this.setChecker({ row, col }, { color });

      this.checkForDraw() || this.checkForWinFrom({ row, col });
      this.toggleColor();
    },

    land() {
      if (this.isDraw) return this.displayDraw();

      if (this.winner) {
        this.displayWin(this.winner);
      } else {
        this.isLocked = false;
      }
    },

//  check all viable horizonal segments FOR THE WIN. Return the winner OR
//  check all viable vertical segments FTW. Return the winner OR
//  check all viable "forward slash" segments FTW. Return the winner OR
//  check all viable "back slash" segments FTW. Return the winner OR
    //logic for draw game
    checkForDraw() {
      this.isDraw = Object.keys(this.checkers).length === this.rowCount * this.colCount;
    },

    //logic to check the winner
    getWinner(...segment) {

      //if same checkered color are n a row then winner else conitue play
      if (segment.length !== 4) return false;

      //comaring the colors of rows, columns of checkers
      const checkers = segment.map(([row, col]) => this.getChecker({ row, col }));
      const color = checkers[0].color;
      if (color === EMPTY) return false;
      if (checkers.every(c => c.color === color)) return { color, checkers };
      return false;
    },

    //checking the horizontal line for the same color
    checkHorizontalSegments({ focalRow, minCol, maxCol }) {
      for (let row = focalRow, col = minCol; col <= maxCol; col++) {
        const winner = this.getWinner([row, col], [row, col + 1], [row, col + 2], [row, col + 3]);
        if (winner) return winner;
      }
    },

    //checking the vertical line for the same color
    checkVerticalSegments({ focalRow, focalCol, minRow, maxRow }) {
      for (let col = focalCol, row = minRow; row <= focalRow; row++) {
        const winner = this.getWinner([row, col], [row + 1, col], [row + 2, col], [row + 3, col]);
        if (winner) return winner;
      }
    },

    //checking the forward diagonal line for the same color
    checkForwardSlashSegments({ focalRow, focalCol, minRow, minCol, maxRow, maxCol }) {
      const startForwardSlash = (row, col) => {
        while (row > minRow && col > minCol) {row--;col--;}
        return [row, col];
      };

      for (let [row, col] = startForwardSlash(focalRow, focalCol); row <= maxRow && col <= maxCol; row++, col++) {
        const winner = this.getWinner([row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]);
        if (winner) return winner;
      }
    },

    //checking the backward diagonal line for the same color
    checkBackwardSlashSegments({ focalRow, focalCol, minRow, minCol, maxRow, maxCol }) {
      const startBackwardSlash = (row, col) => {
        while (row < maxRow && col > minCol) {row++;col--;}
        return [row, col];
      };
      for (let [row, col] = startBackwardSlash(focalRow, focalCol); row >= minRow && col <= maxCol; row--, col++) {
        const winner = this.getWinner([row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]);
        if (winner) return winner;
      }
    },

    //method to check for winner
    checkForWinFrom(lastChecker) {
      if (!lastChecker) return;
      const { row: focalRow, col: focalCol } = lastChecker;
      const minCol = min(focalCol);
      const maxCol = max(focalCol, this.colCount - 1);
      const minRow = min(focalRow);
      const maxRow = max(focalRow, this.rowCount - 1);
      const coords = { focalRow, focalCol, minRow, minCol, maxRow, maxCol };

      this.winner = this.checkHorizontalSegments(coords) ||
      this.checkVerticalSegments(coords) ||
      this.checkForwardSlashSegments(coords) ||
      this.checkBackwardSlashSegments(coords);
    },

    displayDraw() {
      this.status = OVER;
    },

    displayWin(winner) {
      this.winner = winner;
      this.status = OVER;
      this.winner.checkers.forEach(checker => {
        this.setChecker(checker, { isWinner: true });
      });
      console.log('Win!', winner);
    } } });

new Vue({
  el: '#app' });