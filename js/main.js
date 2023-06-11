$(document).ready(main);

function main() {
  var calc = new Calculator();

  $('#buttons button').on('click', calc.buttonHandler);
  $('body').on('keypress', calc.keyHandler.bind(calc));
  $('body').on('keydown', calc.backspaceHandler.bind(calc));
}

var Calculator = function() {
  this.displayObject = new Display(
    $('#display'),
    $('#memoryIndicator'),
    $('#negativeIndicator'),
    $('#errorIndicator')
  );
  this.engineObject = new Engine(true, this);
  this.toggleElement = $('#calcTypeToggle');
  var self = this;

  this.toggleElement.bootstrapSwitch('size', 'mini');
  this.toggleElement.bootstrapSwitch('onColor', 'success');
  this.toggleElement.bootstrapSwitch('offColor', 'danger');
  this.toggleElement.bootstrapSwitch('inverse', 'true');
  this.toggleElement.bootstrapSwitch('labelText', 'MDAS');
  this.toggleElement.bootstrapSwitch(
    'state',
    this.engineObject.getFollowOrderOfOperations()
  );
  this.toggleElement.bootstrapSwitch(
    'onSwitchChange',
    function(event, state) {
      this.engineObject.setFollowOrderOfOperations(state);
      this.engineObject.clearTotals();
      this.displayObject.clearDisplay();
      this.displayObject.blankDisplay();
    }.bind(this)
  );

  this.keymap = {
    'ON/C': ['ON/C', [32, 8]], // Added backspace key (8)
    '.': ['number', [46]],
    '0': ['number', [48]],
    '1': ['number', [49]],
    '2': ['number', [50]],
    '3': ['number', [51]],
    '4': ['number', [52]],
    '5': ['number', [53]],
    6: ['number', [54]],
    7: ['number', [55]],
    8: ['number', [56]],
    9: ['number', [57]],
    '+': ['operation', [43]],
    '-': ['operation', [45]],
    '×': ['operation', [42]],
    '÷': ['operation', [47, 92]],
    '=': ['operation', [13, 61]],
    '+/-': ['immediateoperation', [35]],
    '√': ['immediateoperation', [36]],
    '%': ['immediateoperation', [37]],
    MRC: ['memory', [98]],
    'M+': ['memory', [109]],
    'M-': ['memory', [110]],
  };

  this.buttonHandler = function() {
    setTimeout(function() {
      $(this).blur();
    }.bind(this), 200);
    var buttonCaption = $(this).text();
    var buttonType = self.keymap[buttonCaption][0];

    if (self.displayObject.hasError()) {
      if (buttonCaption === 'ON/C') self.displayObject.clearError();
      else return;
    } else {
      if (buttonCaption !== 'ON/C') self.engineObject.setOnButtonClickedOnce(false);
      if (buttonCaption !== 'MRC') self.engineObject.setMemoryButtonClickedOnce(false);

      switch (buttonType) {
        case 'ON/C':
          if (self.engineObject.getOnButtonClickedOnce()) {
            self.engineObject.clearTotals();
          } else {
            self.displayObject.clearDisplay();
            self.engineObject.setOnButtonClickedOnce(true);
          }
          break;

        case 'number':
          self.displayObject.updateDisplayNumber(buttonCaption);
          break;

        case 'operation':
          if (self.displayObject.getTextValue() !== '') {
            if (self.engineObject.getFollowOrderOfOperations()) {
              if (buttonCaption !== '=')
                self.displayObject.setDisplayValue(
                  self.engineObject.updateCalculations(
                    buttonCaption,
                    self.displayObject.getNumberValue()
                  )
                );
              else {
                self.displayObject.blankDisplay();
                setTimeout(function() {
                  self.displayObject.setDisplayValue(
                    self.engineObject.calculateTotal(
                      self.displayObject.getNumberValue()
                    )
                  );
                }, 200);
              }
            } else {
              var runningTotal = self.engineObject.updateRunningTotal(
                buttonCaption,
                self.displayObject.getNumberValue()
              );
              if (buttonCaption !== '=') self.displayObject.setDisplayValue(runningTotal);
              else {
                self.displayObject.blankDisplay();
                setTimeout(function() {
                  self.displayObject.setDisplayValue(runningTotal);
                }, 200);
              }
            }
          }
          break;

        case 'immediateoperation':
          if (self.displayObject.getTextValue() !== '') {
            if (buttonCaption !== '+/-')
              self.displayObject.setDisplayValue(
                self.engineObject.immediateOperations(
                  buttonCaption,
                  self.displayObject.getNumberValue(),
                  self.displayObject.getPriorNumberValue()
                )
              );
            else self.displayObject.toggleNegative();
          }
          break;

        case 'memory':
          if (self.displayObject.getTextValue() !== '') {
            var memoryValue = self.engineObject.updateMemory(
              buttonCaption,
              self.displayObject.getNumberValue()
            );
            if (memoryValue !== undefined) self.displayObject.setDisplayValue(memoryValue);
            self.displayObject.setMemory(self.engineObject.getMemoryValue() !== 0);
            self.displayObject.setDisplayValue();
          }
          break;
      }
    }
  };
}

Calculator.prototype.keyHandler = function(event) {
  var keyPressed = event.which;

  if (keyPressed === 96) {
    this.toggleElement.bootstrapSwitch('state', !this.engineObject.getFollowOrderOfOperations());
  } else if (keyPressed === 104) {
    $('#myModal').modal('show');
    return;
  } else {
    for (var key in this.keymap) {
      if (this.keymap[key][1].indexOf(keyPressed) !== -1) {
        var buttonToClick = $('#buttons button').filter(function() {
          return $(this).text() === key;
        });
        buttonToClick.focus();
        buttonToClick.trigger('click');
        break;
      }
    }
  }
};

Calculator.prototype.backspaceHandler = function(event) {
  var keyPressed = event.which;

  if (keyPressed === 8) {
    var onCButton = $('#buttons button').filter(function() {
      return $(this).text() === 'ON/C';
    });
    onCButton.focus();
    onCButton.trigger('click');
  }
};

var Display = function(displayElement, memoryElement, negativeElement, errorElement) {
  this.textValue = '';
  this.priorTextValue = '';
  this.numberValue = 0;
  this.priorNumberValue = 0;
  this.displayElement = displayElement;
  this.displayElement.val(this.textValue);
  this.memoryElement = memoryElement;
  this.negativeElement = negativeElement;
  this.operationApplied = false;
  this.errorElement = errorElement;
};

Display.prototype.clearDisplay = function () {
  this.numberValue = 0;
  this.textValue = '0';
  this.displayElement.val(this.textValue + '.');
  this.setNegative(false);
};

Display.prototype.blankDisplay = function () {
  this.setNegative(false);
  this.displayElement.val('');
}

Display.prototype.getNumberValue = function () {
  return this.numberValue;
}

Display.prototype.getPriorNumberValue = function () {
  return this.priorNumberValue;
}

Display.prototype.getTextValue = function () {
  return this.textValue;
}

Display.prototype.getPriorTextValue = function () {
  return this.priorTextValue;
}

Display.prototype.updateDisplayNumber = function (numberButton) { //updates display as numbers are entered
  var displayLength = this.textValue.split('').filter(function (x) { return Number.isInteger(+x); }).length;
  if (this.operationApplied && this.textValue === this.priorTextValue) {//checks whether one of the operations buttons was pressed and the number hasn't changed yet
    this.blankDisplay();
    this.textValue = '';
    displayLength = 0;
    this.operationApplied = false;
  }

  if (displayLength < 8 && ((numberButton === '.' && this.textValue.indexOf(numberButton) === -1) || numberButton !== '.')) {
    if (this.textValue === '' && numberButton === '.') this.textValue = '0';
    this.textValue = (this.textValue === '0' && numberButton !== '.' ? '' : this.textValue) + numberButton;
    this.displayElement.val(this.textValue + (this.textValue.indexOf('.') === -1 ? '.' : ''));
    this.numberValue = +this.textValue * (this.isNegative() ? -1 : 1);
  }
};

Display.prototype.setDisplayValue = function (value) { //updates display as numbers are calculated
  if (value !== undefined) this.numberValue = value;
  if (!isFinite(this.numberValue) || this.numberValue > 99999999 || this.numberValue < -99999999) {
    this.setError();
    return;
  }

  else {
    this.textValue = '' + this.numberValue;
    var displayValLength = this.textValue.split('').filter(function (x) { return Number.isInteger(+x); }).length;
    if (displayValLength > 8) {
      var decimalPosition = this.textValue.indexOf('.');

      this.textValue = '' + +Math.abs(this.numberValue).toFixed(8 - decimalPosition); //absolute value is so the number can be campared later on in updateDisplayNumber (positive/negative status will be shown by the indicator)
    }
    else this.textValue = '' + Math.abs(this.numberValue);
  };

  this.priorTextValue = this.textValue;
  this.priorNumberValue = this.numberValue;
  this.operationApplied = true;
  this.displayElement.val(this.textValue + (this.textValue.indexOf('.') === -1 ? '.' : ''));
  this.setNegative(this.numberValue < 0);
};

Display.prototype.setMemory = function (bool) {
  if (bool) this.memoryElement.removeClass('gray');
  else this.memoryElement.addClass('gray');
};

Display.prototype.setNegative = function (bool) {
  if (bool) this.negativeElement.removeClass('gray');
  else this.negativeElement.addClass('gray');
};

Display.prototype.toggleNegative = function () { //+/- button behavior. Display value is set here because the display may not be ready to be converted to a number (for example, ending with a decimal).
  this.negativeElement.toggleClass('gray');
  this.numberValue = -1 * this.numberValue;
};

Display.prototype.isNegative = function () {
  return !this.negativeElement.hasClass('gray');
};

Display.prototype.setError = function () {
  this.blankDisplay();
  this.errorElement.removeClass('gray');
};

Display.prototype.clearError = function () {
  this.errorElement.addClass('gray');
  this.clearDisplay();
};

Display.prototype.hasError = function () {
  return !this.errorElement.hasClass('gray');
};

//object for underlying calculator engine
var Engine = function (followOrderOfOperations, parentObject) {
  this.onButtonClickedOnce = false; //number of times ON/C button clicked. Once to clear the display, the second time clears all calculations/running totals.
  this.followOrderOfOperations = followOrderOfOperations;
  this.calculations = [];
  this.priorCalculations = [];
  this.runningTotal = undefined;
  this.memoryValue = 0;
  this.priorOperator = undefined;
  this.equalsHit = false; //used by the runningTotal function when MDAS mode is off to regulate behavior of repeatedly pressing the '=' button
  this.memoryButtonClickedOnce = false;
}

Engine.prototype.setOnButtonClickedOnce = function (bool) {
  this.onButtonClickedOnce = bool;
}

Engine.prototype.getOnButtonClickedOnce = function () {
  return this.onButtonClickedOnce;
}

Engine.prototype.setMemoryButtonClickedOnce = function (bool) {
  this.memoryButtonClickedOnce = bool;
}

Engine.prototype.getMemoryButtonClickedOnce = function () {
  return this.memoryButtonClickedOnce;
}

Engine.prototype.setFollowOrderOfOperations = function (bool) {
  this.followOrderOfOperations = bool;
}

Engine.prototype.getFollowOrderOfOperations = function () {
  return this.followOrderOfOperations;
}

Engine.prototype.getMemoryValue = function () {
  return this.memoryValue;
}

Engine.prototype.clearTotals = function () {
  if (this.followOrderOfOperations) {
    this.calculations = [];
    this.priorCalculations = [];
  }

  else {
    this.equalsHit = false;
    this.runningTotal = undefined;
  }

  this.onButtonClickedOnce = false;
}

Engine.prototype.immediateOperations = function (char, numberValue, priorNumberValue) {

  if (char === '%') {
    var priorOperation = this.priorCalculations[1];
    if (this.calculations.length === 0 && this.runningTotal === undefined) return numberValue /= 100;
    else return priorNumberValue * (numberValue / 100);
  }

  else if (char === '√') return Math.sqrt(numberValue);
}

Engine.prototype.updateCalculations = function (operator, numberValue) {
  this.priorCalculations = [numberValue, operator];
  this.calculations = this.calculations.concat(this.priorCalculations);
};

Engine.prototype.calculateTotal = function (numberValue) {
  var addInCalc, subInCalc, multInCalc, divInCalc, operationIndex, tmp;
  this.calculations.push(numberValue);
  this.priorCalculations = this.calculations.slice(-2);

  while (this.calculations.find(function (x) { return ['+', '-', '×', '÷'].indexOf(x) !== -1; })) {

    if (this.calculations.find(function (x) { return ['×', '÷'].indexOf(x) !== -1; })) {

      multInCalc = this.calculations.indexOf('×');
      divInCalc = this.calculations.indexOf('÷');

      if (divInCalc === -1 || (divInCalc !== -1 && multInCalc !== -1 && multInCalc < divInCalc)) {
        operationIndex = multInCalc;
        tmp = this.calculations[multInCalc - 1] * this.calculations[multInCalc + 1];
      }
      else {
        operationIndex = divInCalc;
        tmp = this.calculations[divInCalc - 1] / this.calculations[divInCalc + 1];
      };
    }

    else if (this.calculations.find(function (x) { return ['+', '-'].indexOf(x) !== -1; })) {
      addInCalc = this.calculations.indexOf('+');
      subInCalc = this.calculations.indexOf('-');

      if (subInCalc === -1 || (subInCalc !== -1 && addInCalc !== -1 && addInCalc < subInCalc)) {
        operationIndex = addInCalc;
        tmp = this.calculations[addInCalc - 1] + this.calculations[addInCalc + 1];
      }
      else {
        operationIndex = subInCalc;
        tmp = this.calculations[subInCalc - 1] - this.calculations[subInCalc + 1];
      }
    }

    this.calculations.splice(operationIndex, 2);
    this.calculations[operationIndex - 1] = tmp;
  }

  return this.calculations.pop();
};

Engine.prototype.updateRunningTotal = function (operator, numberValue) {
  var currentValue = numberValue;

  if (operator === '=' && this.equalsHit) {
    operator = this.priorCalculations[1];
    numberValue = this.priorCalculations[0];
  }

  else if (this.equalsHit && operator !== '=') {
    this.priorCalculations = [];
    this.runningTotal = undefined;
    this.priorOperator = undefined;
    this.equalsHit = false;
  }

  else {
    this.priorCalculations = [];
  }

  if (this.priorOperator !== undefined && this.runningTotal !== undefined) {
    switch (this.priorOperator) {
      case '+':
        this.runningTotal = this.runningTotal + numberValue;
        break;

      case '-':
        this.runningTotal = this.runningTotal - numberValue;
        break;

      case '×':
        this.runningTotal = this.runningTotal * numberValue;
        break;

      case '÷':
        this.runningTotal = this.runningTotal / numberValue;
        break;
    }
  }
  else this.runningTotal = numberValue;

  if (operator !== '=') {
    this.priorCalculations = [currentValue, operator];
    this.priorOperator = operator;
  }

  else if (!this.equalsHit) {
    this.priorCalculations = [currentValue, operator];
    this.equalsHit = true;
  };

  return this.runningTotal;
}

Engine.prototype.updateMemory = function (mButton, numberValue) {

  if (mButton === 'M+') {
    var newValue = this.memoryValue + numberValue;
    if (!isFinite(newValue) || newValue > 99999999 || newValue < -99999999) return newValue;
    else this.memoryValue += numberValue;
  }

  else if (mButton === 'M-') {
    var newValue = this.memoryValue - numberValue;
    if (!isFinite(newValue) || newValue > 99999999 || newValue < -99999999) return newValue;
    else this.memoryValue -= numberValue;
  }

  else {//MRC button
    if (this.memoryButtonClickedOnce) {
      this.memoryValue = 0;
      this.memoryButtonClickedOnce = false;
    }

    else {
      this.memoryButtonClickedOnce = true;
      return this.memoryValue;
    }
  }
}
