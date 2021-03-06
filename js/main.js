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
    this.speechButton = document.getElementsByClassName('input-area__voice-input')[0];
    this.submitButton.addEventListener('click', this.onSubmitButtonPress.bind(this));
    this.messages = document.getElementsByClassName('messages-area')[0];
    this.errors = document.getElementsByClassName('messages-area__errors')[0];
    this.progressBar = document.querySelector('.input-area progress');
    this.popup = new Popup();
    this.recognizeSpeechSetup();
    this.speechButton.addEventListener('click', (function() {
      this.recognizer.start();
    }).bind(this));
    document.querySelectorAll('header button')[0].addEventListener('click', this.initiateNewGame.bind(this));
    document.querySelectorAll('header button')[1].addEventListener('click', this.openRules.bind(this));
    this.initiateNewGame();
  }

  newGame() {
    let difficulty = parseInt(this.popup.popupWindow.querySelector('input[name=difficulty]:checked').value),
      timeLimit = this.popup.popupWindow.querySelector('input[name=time-limit]').checked;
    this.handsfree = this.popup.popupWindow.querySelector('input[name=handsfree]').checked;
    this.sayCities = this.popup.popupWindow.querySelector('input[name=speak-cities]').checked;
    this.playersCities = [];
    this.computersCities = [];
    this.cities = {};
    this.setupCities(difficulty);
    this.gameActive = true;
    if (timeLimit) {
      this.turnDuration = 20000 + (difficulty / 2) * 8000;
      this.progressBar.style.display = 'block';
      this.progressBar.value = 1;
    } else {
      this.turnDuration = false;
      this.progressBar.style.display = 'none';
    };
    this.cleanMessages();
    this.cleanMap();
    this.popup.close();
    this.cityNameInput.focus();
    if (this.handsfree) this.recognizer.start();
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

  recognizeSpeechSetup() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognizer = new SpeechRecognition();
    this.recognizer.lang = 'ru-RU';
    this.recognizer.maxAlternatives = 1;
    this.recognizer.interimResults = false;
    this.recognizer.addEventListener('result', (function(e) {
      let last = e.results.length - 1, city = e.results[last][0].transcript;
      this.cityNameInput.value = city;
      this.playersTurn(city);
    }).bind(this));

    this.recognizer.addEventListener('start', (function () {
      this.speechButton.classList.add('input-area__voice-input_listening');
    }).bind(this));

    this.recognizer.addEventListener('end', (function () {
      if (this.handsfree && this.gameActive) this.recognizer.start();
    }).bind(this));

    this.recognizer.addEventListener('speechend', (function() {
      this.recognizer.stop();
      this.speechButton.classList.remove('input-area__voice-input_listening');
    }).bind(this));

    this.recognizer.addEventListener('nomatch', (function() {
      this.spawnError("Нет такого города!");
    }).bind(this));

    this.recognizer.addEventListener('error', (function(e) {
      console.log(e);
      this.spawnError("Вас не слышно");
    }).bind(this));
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

  cleanMap() {
    this.map.geoObjects.each(obj => obj.getParent().remove(obj));
  }

  spawnError(text) {
    let error = document.createElement('div');
    error.classList.add('messages-area__errors__error');
    let errorText = document.createElement('span');
    errorText.classList.add('messages-area__errors__error__text')
    errorText.innerText = text;
    error.appendChild(errorText);
    this.errors.appendChild(error);
    setTimeout((function (error) {
      error.classList.add('messages-area__errors__error__text_fading');
    }).bind(this, errorText), 2500);
    setTimeout((function (error) {
      this.errors.removeChild(error);
    }).bind(this, error), 3400);
  }

  playersTurn(cityInput) {
    cityInput = cityInput.toLowerCase();
    if (allCities.indexOf(cityInput) === -1) return this.spawnError('Нет такого города!');
    if (!((this.playersCities.indexOf(cityInput) === -1) &&
        (this.computersCities.indexOf(cityInput) === -1))) return this.spawnError('Повторяемся, гражданин!');
    if (this.computersCities.length !== 0) {
      let lastComputersTurn = this.computersCities[this.computersCities.length - 1],
        lastComputersTurnLetter = lastComputersTurn[lastComputersTurn.length - 1];
      if (this.forbiddenLetters.indexOf(lastComputersTurnLetter) !== -1) {
        lastComputersTurnLetter = lastComputersTurn[lastComputersTurn.length - 2];
      };
      if (cityInput[0] !== lastComputersTurnLetter) return this.spawnError('Первая буква вашего города должна совпадать с последней буквой города соперника');
    }
    clearInterval(this.progressTick);
    let cityGeocoder = this.geocode(cityInput);
    cityGeocoder.then((res) => {
      let city = res.geoObjects.get(0);
      let cityName = this.capitalise(cityInput);
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
      let cityNameForMap = this.capitalise(cityName);
      city.properties.set('iconContent', cityNameForMap);
      city.options.set('preset', 'twirl#blueStretchyIcon');
      this.map.geoObjects.add(city);
      this.computersCities.push(cityName);
      this.createMessage(cityNameForMap, 'computer');
      this.sayCity(cityName);
      if (this.turnDuration) {
        this.progressTick = this.progressBarDecay();
      };
    });
  }

  progressBarDecay() {
    this.turnTimePassed = 0;
    let tick = this.turnDuration / 400;
    return setInterval((function (base) {
      this.turnTimePassed += base;
      this.progressBar.value = 1 - this.turnTimePassed / this.turnDuration;
      if (this.turnTimePassed >= this.turnDuration) this.victory_computer();
    }).bind(this, tick), tick);
  }

  sayCity(city) {
    if (!this.sayCities) return;
    let speech = new SpeechSynthesisUtterance(city);
    if (speech) {
      window.speechSynthesis.speak(speech);
    };
  }

  makeSettings() {
    let settings = document.querySelector('.templates .templates__settings').cloneNode(true);
    settings.classList.remove('templates__settings');
    settings.classList.add('settings');
    settings.lastElementChild.addEventListener('click', this.newGame.bind(this));
    settings.querySelectorAll('input[name=difficulty]')[0].checked = true;
    return settings;
  }

  endGame() {
    clearInterval(this.progressTick);
    this.handsfree = false;
    this.gameActive = false;
    this.recognizer.stop();
  }

  victory_player() {
    this.endGame();
    this.popup.open(this.makeResults('Вы победили!'));
  }

  victory_computer() {
    this.endGame();
    this.popup.open(this.makeResults('Победил компьютер'));
    this.sayCity('Ха-ха! Я победил!');
  }

  makeResults(winner) {
    let results = document.querySelector('.templates .templates__results').cloneNode(true),
      citiesLists = results.querySelectorAll('ul');
    results.classList.remove('templates__results');
    results.classList.add('results');
    results.querySelector('h2').innerText = winner;
    this.playersCities.forEach(city => {
      let cityListItem = document.createElement('li');
      cityListItem.innerText = this.capitalise(city);
      citiesLists[0].appendChild(cityListItem);
    });
    this.computersCities.forEach(city => {
      let cityListItem = document.createElement('li');
      cityListItem.innerText = this.capitalise(city);
      citiesLists[1].appendChild(cityListItem);
    });
    results.lastElementChild.addEventListener('click', this.initiateNewGame.bind(this));
    return results;
  }

  makeRules() {
    let rules = document.querySelector('.templates .templates__rules').cloneNode(true);
    rules.classList.remove('templates__rules');
    rules.classList.add('rules');
    rules.lastElementChild.addEventListener('click', this.popup.close.bind(this.popup));
    return rules;
  }

  openRules() {
    this.popup.open(this.makeRules());
  }

  initiateNewGame() {
    this.endGame();
    this.popup.close();
    this.popup.open(this.makeSettings());
  }

  capitalise(text) {
    return text.split('-').map(part => {
      return part.split(' ').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
    }).join('-');
  }
}

let game = new Game();

ymaps.ready(game.initMap.bind(game));