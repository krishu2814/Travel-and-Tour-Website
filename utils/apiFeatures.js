// this.query	=> Mongoose Query Object	=> Model.find() => query
// Tour.find()	=> Used to build the MongoDB query
// (e.g., .find(), .sort(), .limit(), etc.)
/*
 * HANDLEFACTORY FILE
 * const features = new APIFeatures(Model.find(filter), req.query)
 * .filter()
 * .sort()
 * .limitFields()
 * .paginate();
 */
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // ALL THE queryString WILL BE PASSED HERE🙏🙏🙏🙏🙏🙏
  filter() {
    // 1A) FILTERING

    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const queryObj = { ...this.queryString }; // copy of original in ES6
    // const excludedFields = ['page', 'sort', 'limit', 'fiels'];
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // removes excludedFields from queryObj ...
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) ADVANCED FILTERING

    // price[gte]=500 becomes { price: { $gte: 500 } })
    // console.log(typeof queryObj);
    // Object → String =>	To use .replace() for $gte, $lt, etc.
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // adding $ sign...
    // String → Object	To make it usable in MongoDB query
    this.query = this.query.find(JSON.parse(queryStr)); // converts the modified JSON string back into a JavaScript object.
    return this;
  }
  // 2) SORT

  // GET /api/products?sort=price,rating
  sort() {
    if (this.queryString.sort) {
      const temp = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(temp);
    } else {
      this.query = this.query.sort('-createdAt'); // newly created first
    }
    return this;
  }

  // 3) FIELD LIMITING

  // GET /api/products?fields=name,price
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      // Which tells MongoDB: Only return name and price fields for each document.
      // this.query.select('name price');
      this.query = this.query.select(fields);
    } else {
      // which is automatically added by Mongoose to track versioning
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // 4) PAGINATION

  // GET /api/v1/tours?page=2&limit=10
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100; // sets a default limit of 100 documents per page if no limit is specified
    const skip = (page - 1) * limit;
    // 127.0.0.1:3000/api/v1/tours?page=2&limit=10    // 1-10:- page1 // 11-20:- page2
    // the core calculation for determining how many documents to "skip" from the beginning of the result set.
    // skip(n)	Skip first n documents
    // limit(m)	Return next m documents
    this.query = this.query.skip(skip).limit(limit);
    // if (this.query.page) {
    //   const numTours = await Tour.countDocuments(); /* IMPORTANT */
    //   if (skip >= numTours) throw new Error('This page does not exists.');
    // }
    return this;
  }
}

module.exports = APIFeatures;
