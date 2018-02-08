'use strict';

class Game {

  constructor() {
    this.playersCities = [];
    this.computersCities = [];
    this.cities = {};
    allCities.sort(() => Math.random() - 0.5); // перемешаем города в исходном массиве для того, чтобы компьютер пореже повторялся в разных играх
    allCities.forEach(cityName => {
      let firstLetter = cityName[0];
      if (!this.cities[firstLetter]) this.cities[firstLetter] = [];
      this.cities[firstLetter].push(cityName);
    });
    this.forbiddenLetters = ['ь', 'ъ', 'ы'];

    this.cityNameInput = document.getElementsByClassName('input-area__textfield')[0];
    this.submitButton = document.getElementsByClassName('input-area__submit-button')[0];
    this.submitButton.addEventListener('click', this.onSubmitButtonPress.bind(this));
    this.messages = document.getElementsByClassName('messages-area')[0];
  }

  initMap() {
    this.map = new ymaps.Map('ymap', {
      center: [10, 150],
      zoom: 2
    });
  }

  geocode(cityInput) {
    return ymaps.geocode(cityInput, { kind: 'locality' });
  }

  onSubmitButtonPress() {
    if (!this.cityNameInput.value) return;
    this.playersTurn(this.cityNameInput.value);
  }

  createMessage(cityName, whos) {
    let newMessage = document.createElement('div');
    newMessage.classList.add('messages-area__message');
    newMessage.classList.add(`messages-area__message_${whos}`);
    newMessage.innerText = cityName;
    this.messages.appendChild(newMessage);
    newMessage.scrollIntoView(true);
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
    });
  }
}

let game = new Game();

ymaps.ready(game.initMap.bind(game));