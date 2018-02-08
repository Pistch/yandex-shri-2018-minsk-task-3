let fs = require('fs');

let cities = fs.readFileSync("./countries.sql", "utf8");

let citiesArray = cities.split("\n").map((cityString) => {
	let matches = cityString.match(/\(\d*\,\s*\d*\,\s*\d*\,\s*\'(.*)\'.*/i);
	if (matches) {
		matches[1] = matches[1].trim();
		if (matches[1].match(/^[а-яА-Я].*/i)) return matches[1].toLowerCase();
	};
	return null;
}).filter((city, i, arr) => {
  if (!city) return false;
  return (arr.indexOf(city) === -1);
});

let scriptContent = `let allCities = JSON.parse('${JSON.stringify(citiesArray)}');`

fs.open("../js/cities.js", "w+", 0o644, function(err, file_handle) {
    if (!err) {
		fs.write(file_handle, scriptContent, null, 'utf-8', function(err, written) {
	        if (!err) {
	            console.log("Текст успешно записан в файл");
	        } else {
	            console.log("Произошла ошибка при записи");
	        }
	    });
    } else {
        console.log("Произошла ошибка при открытии");
    }
});