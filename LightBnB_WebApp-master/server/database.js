const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  //Accepts an email address and will return a promise.
  //The promise should resolve with the user that has that email address, or null if that user does not exist.
  
  return pool
    .query(`SELECT * FROM users WHERE email = $1 LIMIT 1;`, [`${email}`])
    .then((result) => {
      console.log(result.rows);
      if (!result) {
        return null;
      } else {
        return result.rows[0];
      }
    })
    .catch((err) => {
      console.log(err.message);
    });

  // let user;
  // for (const userId in users) {
  //   user = users[userId];
  //   if (user.email.toLowerCase() === email.toLowerCase()) {
  //     break;
  //   } else {
  //     user = null;
  //   }
  // }
  // return Promise.resolve(user);
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1 LIMIT 1;`, [`${id}`])
  .then((result) => {
    //console.log(result.rows);
    if (!result) {
      return null;
    } else {
      return result.rows[0];
    }
  })
  .catch((err) => {
    console.log(err.message);
  });
  
  //return Promise.resolve(users[id]);
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
  .query(`INSERT INTO users (name, email, password)
  VALUES 
  ($1, $2, 'password') RETURNING *;
  `, [`${user.name}`,`${user.email}` ])
  .then((result) => {
    //console.log(result.rows);
    if (!result) {
      return null;
    } else {
      console.log(result.rows[0].id);
      return result.rows[0].id;
    }
  })
  .catch((err) => {
    console.log(err.message);
  });
  
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
  .query(`SELECT * FROM reservations WHERE guest_id = $1 LIMIT $2;
  `, [`${guest_id}`, limit])
  .then((result) => {
    console.log(result.rows);
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
  
  //return getAllProperties(null, 2);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

 const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  if (options.owner_id) {
    if (options.city) {
      queryString += `AND `;
    } else {
      queryString += `WHERE `
    }
    queryParams.push(`${options.owner_id}`);
    queryString += `owner_id = $${queryParams.length} `;
  }
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    if (options.city || options.owner_id) {
      queryString += `AND `;
    } else {
      queryString += `WHERE `
    }
    queryParams.push(`${options.minimum_price_per_night}`);

    queryString += `properties.cost_per_night > $${queryParams.length}`;
    let index = queryParams.length - 1;
    queryParams[index] = Number(queryParams[index]);

    queryParams.push(`${options.maximum_price_per_night}`);
    queryString += ` AND properties.cost_per_night < $${queryParams.length} `;
    index = queryParams.length - 1;
    queryParams[index] = Number(queryParams[index]);
  }
  if (options.minimum_rating) {
    if ((options.city || options.owner_id) || (options.minimum_price_per_night && options.maximum_price_per_night)) {
      queryString += `AND `;
    } else {
      queryString += `WHERE `
    }
    queryParams.push(`${options.minimum_rating}`);
    queryString += `property_reviews.rating > $${queryParams.length} `;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY properties.cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

//  const getAllProperties = (options, limit = 10) => {
//   return pool
//     .query(`SELECT * FROM properties LIMIT $1`, [limit])
//     .then((result) => {
//       //console.log(result.rows);
//       return result.rows;
//     })
//     .catch((err) => {
//       console.log(err.message);
//     });
// };
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  return pool
  .query(`INSERT INTO properties (owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_space,
    number_of_bathrooms,
    number_of_bedrooms)
  VALUES 
  ($1, $2, $3, $5, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
  `, [`${property.title}`, `${property.description}`, `${property.cover_photo_url}`, `${property.cost_per_night}`, `${property.street}`,
  `${property.city}`, `${property.province}`, `${property.post_code}`, `${property.country}`, `${property.parking_space}`,
  `${property.number_of_bathrooms}`, `${property.number_of_bedrooms}`])
  .then((result) => {
    console.log(result.rows);
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
  
  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
}
exports.addProperty = addProperty;
