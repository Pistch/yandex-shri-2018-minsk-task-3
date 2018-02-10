'use strict';

class Popup {
  constructor() {
    this.popup = document.getElementsByClassName('popup__gag')[0];
    this.popupWindow = document.getElementsByClassName('popup__window')[0];
  }

  open(content) {
    this.popupWindow.appendChild(content);
    this.popup.style.display = 'flex';
  }

  close() {
    this.popup.style.display = 'none';
    let children = this.popupWindow.children,
      childrenCount = children.length;
    for (let i = 0; i < childrenCount; i++) {
      this.popupWindow.removeChild(children[i]);
    };
  }
}

class Game {
  constructor() {
    this.forbiddenLetters = ['ь', 'ъ', 'ы'];
    this.turnDuration = false;
    this.cityNameInput = document.getElementsByClassName('input-area__textfield')[0];
    this.cityNameInput.addEventListener('keyup', (e) => {
      if (e.keyCode === 13) this.onSubmitButtonPress();
    });
    this.submitButton = document.getElementsByClassName('input-area__submit-button')[0];
    this.submitButton.addEventListener('click', this.onSubmitButtonPress.bind(this));
    this.messages = document.getElementsByClassName('messages-area')[0];
    this.popup = new Popup();
    this.popup.open(this.makeSettings());
  }

  newGame() {
    let difficulty = parseInt(this.popup.popupWindow.querySelector('input[name=difficulty]:checked').value),
      timeLimit = this.popup.popupWindow.querySelector('input[name=time-limit]').checked;
    this.playersCities = [];
    this.computersCities = [];
    this.cities = {};
    this.setupCities(difficulty);
    if (timeLimit) {
      this.turnDuration = 30000 + (difficulty / 2) * 10000;
    } else {
      this.turnDuration = false;
    };
    this.cleanMessages();
    this.popup.close();
    this.cityNameInput.focus();
  }

  setupCities(difficulty) {
    allCities.sort(() => Math.random() - 0.5); // перемешаем города в исходном массиве для того, чтобы компьютер пореже повторялся в разных играх
    let thisGameCities = [];
    if (difficulty) {                          // при низкой сложности упростим задачу игрока, сократив количество городов, доступных компьютеру
      thisGameCities = allCities.filter(() => {
        return ((Math.random() - difficulty * 0.1) > 0);
      });
    } else {
      thisGameCities = [ ...allCities ];
    };
    thisGameCities.forEach(cityName => {
      let firstLetter = cityName[0];
      if (!this.cities[firstLetter]) this.cities[firstLetter] = [];
      this.cities[firstLetter].push(cityName);
    });
  }

  initMap() {
    this.map = new ymaps.Map('ymap', {
      center: [20, 150],
      zoom: 2
    });
    this.map.behaviors.disable(['rightMouseButtonMagnifier', 'dblClickZoom']).enable(['scrollZoom']);
  }

  geocode(cityInput) {
    return ymaps.geocode(cityInput, { kind: 'locality' });
  }

  onSubmitButtonPress() {
    if (!this.cityNameInput.value) return;
    this.playersTurn(this.cityNameInput.value);
    this.cityNameInput.focus();
  }

  createMessage(cityName, whos) {
    let newMessage = document.createElement('div');
    newMessage.classList.add('messages-area__message');
    newMessage.classList.add(`messages-area__message_${whos}`);
    newMessage.innerText = cityName;
    this.messages.appendChild(newMessage);
    newMessage.scrollIntoView(true);
  }

  cleanMessages() {
    let messages = document.querySelectorAll('.messages-area__message');
    if (messages.length > 0) {
      messages.forEach(el => el.parentNode.removeChild(el));
    }
  }

  playersTurn(cityInput) {
    cityInput = cityInput.toLowerCase();
    if (allCities.indexOf(cityInput) === -1) { // TODO: вывод ошибок
      console.log('Нет такого города!');
      return;
    };
    if (!((this.playersCities.indexOf(cityInput) === -1) && (this.computersCities.indexOf(cityInput) === -1))) {
      console.log('Повторяемся, гражданин!');
      return;
    };
    if (this.computersCities.length !== 0) {
      let lastComputersTurn = this.computersCities[this.computersCities.length - 1],
        lastComputersTurnLetter = lastComputersTurn[lastComputersTurn.length - 1];
      if (this.forbiddenLetters.indexOf(lastComputersTurnLetter) !== -1) {
        lastComputersTurnLetter = lastComputersTurn[lastComputersTurn.length - 2];
      };
      if (cityInput[0] !== lastComputersTurnLetter) {
        console.log('Первая буква вашего города должна совпадать с последней буквой города соперника');
        return;
      };
    }
    clearTimeout(this.turnTimeout);
    let cityGeocoder = this.geocode(cityInput);
    cityGeocoder.then((res) => {
      let city = res.geoObjects.get(0);
      let cityName = [cityInput[0].toUpperCase(), cityInput.slice(1).toLowerCase()].join('');
      city.properties.set('iconContent', cityName);
      city.options.set('preset', 'twirl#greenStretchyIcon');
      this.map.geoObjects.add(city);
      this.playersCities.push(cityInput);
      this.createMessage(cityName, 'player');
      this.cityNameInput.value = '';
      this.computersTurn();
    });
  }

  computersTurn() {
    let playersLastCity = this.playersCities[this.playersCities.length - 1],
      letter = playersLastCity[playersLastCity.length - 1].toLowerCase();
    if (this.forbiddenLetters.indexOf(letter) !== -1) letter = playersLastCity[playersLastCity.length - 2].toLowerCase();
    let cityName = this.cities[letter].pop();
    while ((this.playersCities.indexOf(cityName) !== -1) && (this.computersCities.indexOf(cityName) !== -1)) {
      if (this.cities[letter].length === 0) return this.victory_player();
      cityName = this.cities[letter].pop();
    };
    let cityGeocoder = this.geocode(cityName);
    cityGeocoder.then((res) => {
      let city = res.geoObjects.get(0);
      if (!city) {
        return this.computersTurn();
      };
      let cityNameForMap = [cityName[0].toUpperCase(), cityName.slice(1).toLowerCase()].join('');
      city.properties.set('iconContent', cityNameForMap);
      city.options.set('preset', 'twirl#blueStretchyIcon');
      this.map.geoObjects.add(city);
      this.computersCities.push(cityName);
      this.createMessage(cityNameForMap, 'computer');
      if (this.turnDuration) {
        this.turnTimeout = setTimeout(this.victory_computer.bind(this), this.turnDuration);
      }
    });
  }

  makeSettings() {
    let settings = document.querySelector('.templates .templates__settings').cloneNode(true);
    settings.classList.remove('templates__settings');
    settings.classList.add('settings');
    settings.lastElementChild.addEventListener('click', this.newGame.bind(this));
    settings.querySelectorAll('input[name=difficulty]')[0].checked = true;
    return settings;
  }

  victory_player() {
    alert('Вы победили!');
  }

  victory_computer() {
    alert('Вы не победили...');
  }

  makeResults() {

  }
}

let game = new Game();

ymaps.ready(game.initMap.bind(game));