var mongoose = require("mongoose");

var animeSchema = mongoose.Schema({
    id: String,
    title: String,
    image_url: String,
    day: String,
    season: String,
    year: String
});

module.exports = mongoose.model("Anime", animeSchema);