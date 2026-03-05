/**
 * Country utilities for map initialization
 */

// Country name to coordinates mapping
const COUNTRY_COORDINATES = {
  'United States': [39.8283, -98.5795],
  'Spain': [40.4637, -3.7492],
  'United Kingdom': [55.3781, -3.4360],
  'Germany': [51.1657, 10.4515],
  'France': [46.2276, 2.2137],
  'Italy': [41.8719, 12.5674],
  'Netherlands': [52.1326, 5.2913],
  'Belgium': [50.5039, 4.4699],
  'Switzerland': [46.8182, 8.2275],
  'Austria': [47.5162, 14.5501],
  'Poland': [51.9194, 19.1451],
  'Czech Republic': [49.8175, 15.4730],
  'Hungary': [47.1625, 19.5033],
  'Romania': [45.9432, 24.9668],
  'Bulgaria': [42.7339, 25.4858],
  'Greece': [39.0742, 21.8243],
  'Portugal': [39.3999, -8.2245],
  'Ireland': [53.4129, -8.2439],
  'Denmark': [56.2639, 9.5018],
  'Sweden': [60.1282, 18.6435],
  'Norway': [60.4720, 8.4689],
  'Finland': [61.9241, 25.7482],
  'Canada': [56.1304, -106.3468],
  'Australia': [-25.2744, 133.7751],
  'New Zealand': [-40.9006, 174.8860],
  'Japan': [36.2048, 138.2529],
  'South Korea': [35.9078, 127.7669],
  'China': [35.8617, 104.1954],
  'India': [20.5937, 78.9629],
  'Brazil': [-14.2350, -51.9253],
  'Argentina': [-38.4161, -63.6167],
  'Mexico': [23.6345, -102.5528],
  'Russia': [61.5240, 105.3188],
  'Turkey': [38.9637, 35.2433],
  'Egypt': [26.0975, 30.0444],
  'South Africa': [-30.5595, 22.9375],
  'Nigeria': [9.0820, 8.6753],
  'Kenya': [-0.0236, 37.9062],
  'Morocco': [31.6295, -7.9811],
  'Algeria': [28.0339, 1.6596],
  'Tunisia': [33.8869, 9.5375],
  'Libya': [26.3351, 17.2283],
  'Sudan': [12.8628, 30.2176],
  'Ethiopia': [9.1450, 40.4897],
  'Ghana': [7.9465, -1.0232],
  'Senegal': [14.4974, -14.4524],
  'Mali': [17.5707, -3.9962],
  'Burkina Faso': [12.2383, -1.5616],
  'Niger': [17.6078, 8.0817],
  'Chad': [15.4542, 18.7322],
  'Cameroon': [7.3697, 12.3547],
  'Central African Republic': [6.6111, 20.9394],
  'Democratic Republic of the Congo': [-4.0383, 21.7587],
  'Republic of the Congo': [-0.2280, 15.8277],
  'Gabon': [-0.8037, 11.6094],
  'Equatorial Guinea': [1.6508, 10.2679],
  'Sao Tome and Principe': [0.1864, 6.6131],
  'Angola': [-11.2027, 17.8739],
  'Zambia': [-13.1339, 27.8493],
  'Zimbabwe': [-19.0154, 29.1549],
  'Botswana': [-22.3285, 24.6849],
  'Namibia': [-22.9576, 18.4904],
  'Lesotho': [-29.6100, 28.2336],
  'Swaziland': [-26.5225, 31.4659],
  'Mozambique': [-18.6657, 35.5296],
  'Madagascar': [-18.7669, 46.8691],
  'Mauritius': [-20.3484, 57.5522],
  'Seychelles': [-4.6796, 55.4920],
  'Comoros': [-11.8750, 43.8722],
  'Mayotte': [-12.8275, 45.1662],
  'Reunion': [-21.1151, 55.5364],
  'Saint Helena': [-24.1434, -10.0307],
  'Ascension Island': [-7.9467, -14.3559],
  'Tristan da Cunha': [-37.1136, -12.2777],
  'Falkland Islands': [-51.7963, -59.5236],
  'South Georgia and the South Sandwich Islands': [-54.4296, -36.5879],
  'Antarctica': [-75.2509, -0.0713],
  'Greenland': [71.7069, -42.6043],
  'Iceland': [64.9631, -19.0208],
  'Faroe Islands': [61.8926, -6.9118],
  'Svalbard and Jan Mayen': [77.5536, 23.6703],
  'Jan Mayen': [70.9756, -8.6670],
  'Bouvet Island': [-54.4208, 3.3464],
  'Heard Island and McDonald Islands': [-53.0818, 73.5042],
  'French Southern Territories': [-49.2804, 69.3486],
  'British Indian Ocean Territory': [-6.0000, 71.5000],
  'Cocos Islands': [-12.1642, 96.8710],
  'Christmas Island': [-10.4475, 105.6904],
  'Norfolk Island': [-29.0408, 167.9547],
  'Pitcairn Islands': [-24.7036, -127.4393],
  'Tokelau': [-8.9674, -171.8559],
  'Niue': [-19.0544, -169.8672],
  'Cook Islands': [-21.2367, -159.7777],
  'American Samoa': [-14.2710, -170.1322],
  'Samoa': [-13.7590, -172.1046],
  'Tonga': [-21.1789, -175.1982],
  'Fiji': [-16.5788, 179.4144],
  'Vanuatu': [-15.3767, 166.9592],
  'Solomon Islands': [-9.6457, 160.1562],
  'Papua New Guinea': [-6.3150, 143.9555],
  'Nauru': [-0.5228, 166.9315],
  'Kiribati': [-3.3704, -168.7340],
  'Tuvalu': [-7.1095, 177.6493],
  'Wallis and Futuna': [-13.7687, -177.1561],
  'French Polynesia': [-17.6797, -149.4068],
  'New Caledonia': [-20.9043, 165.6180],
  'Palau': [7.5150, 134.5825],
  'Marshall Islands': [7.1315, 171.1845],
  'Micronesia': [7.4256, 150.5508],
  'Guam': [13.4443, 144.7937],
  'Northern Mariana Islands': [17.3308, 145.3846],
  'Wake Island': [19.2823, 166.6470],
  'Johnston Atoll': [16.7295, -169.5334],
  'Midway Islands': [28.2108, -177.3734],
  'Hawaii': [19.8968, -155.5828],
  'Alaska': [64.2008, -149.4937],
  'Puerto Rico': [18.2208, -66.5901],
  'US Virgin Islands': [18.3358, -64.8963],
  'British Virgin Islands': [18.4207, -64.6399],
  'Anguilla': [18.2206, -63.0686],
  'Montserrat': [16.7425, -62.1874],
  'Guadeloupe': [16.9950, -62.0676],
  'Martinique': [14.6415, -61.0242],
  'Saint Barthelemy': [17.9000, -62.8333],
  'Saint Martin': [18.0708, -63.0501],
  'Sint Maarten': [18.0425, -63.0548],
  'Saint Kitts and Nevis': [17.3578, -62.7830],
  'Antigua and Barbuda': [17.0608, -61.7964],
  'Dominica': [15.4150, -61.3710],
  'Saint Lucia': [13.9094, -60.9789],
  'Saint Vincent and the Grenadines': [12.9843, -61.2872],
  'Grenada': [12.2626, -61.6043],
  'Barbados': [13.1939, -59.5432],
  'Trinidad and Tobago': [10.6918, -61.2225],
  'Aruba': [12.5211, -69.9683],
  'Curacao': [12.1696, -68.9900],
  'Bonaire': [12.2019, -68.2628],
  'Sint Eustatius': [17.4890, -62.9734],
  'Saba': [17.6355, -63.2327],
  'Cayman Islands': [19.3133, -81.2546],
  'Jamaica': [18.1096, -77.2975],
  'Cuba': [21.5218, -77.7812],
  'Haiti': [18.9712, -72.2852],
  'Dominican Republic': [18.7357, -70.1627],
  'Bahamas': [25.0343, -77.3963],
  'Turks and Caicos Islands': [21.6940, -71.7979],
  'Bermuda': [32.3078, -64.7505],
  'Saint Pierre and Miquelon': [46.8852, -56.3159]
}

/**
 * Get user's country from IP geolocation
 * @returns {Promise<string>} Country name
 */
export const getUserCountry = async () => {
  try {
    const response = await fetch('http://ip-api.com/json/', {
      timeout: 5000
    })
    const data = await response.json()
    return data.country || 'Spain' // fallback to Spain
  } catch (error) {
    console.error('Error getting user country:', error)
    return 'Spain' // fallback to Spain
  }
}

/**
 * Get coordinates for a country
 * @param {string} country - Country name
 * @returns {[number, number]} [latitude, longitude]
 */
export const getCountryCoordinates = (country) => {
  return COUNTRY_COORDINATES[country] || [-25.2744, 133.7751] // Australia fallback
}

/**
 * Initialize map with user's country
 * @returns {Promise<[number, number]>} [latitude, longitude]
 */
export const initializeMapWithUserCountry = async () => {
  try {
    const country = await getUserCountry()
    console.log('🌍 Detected user country:', country)
    return getCountryCoordinates(country)
  } catch (error) {
    console.error('Error initializing map with user country:', error)
    return [-25.2744, 133.7751] // Australia fallback
  }
}
