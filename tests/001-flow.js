var us = require('underscore');
var test_data = require('../support/test-data');
var Flow = require('../lib/fnFlow').Flow, Task = Flow.Task, Fn = Flow.Fn;

Book = test_data.Book;
Author = test_data.Author;
Genre = test_data.Genre;
BookSeries = test_data.BookSeries;

module.exports.setUp = function(cb){
  cb();
}
module.exports.tearDown = function(cb){
  cb();
}

module.exports["flow data"] = function(test){
  new Flow({
    getBook: new Task(Book.getById, 'bookId')
  }).execute({
    bookId: 1
  }, function(err, results){
    test.equals(results.getBook, Book.all[1]);
    test.done();
  });
}

module.exports["flow functions and data"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getById, 'authorId'),
    getBooks: new Task(Book.findByAuthorId, 'getAuthor')
  }).execute({
    authorId: 5
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorId: 5,
      getAuthor: Author.all[5],
      getBooks: [Book.all[9], Book.all[10], Book.all[11]]
    });
    test.done();
  });
}

module.exports["parallel flow functions and data"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor'),
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      getBooks: [Book.all[6]]
    });
    test.done();
  });
}

module.exports["function as task"] = function(test){
  new Flow({
    getAuthors: new Task(Author.getAll)
  }).execute(function(err, results){
    test.ok(!err, "no error");
    test.deepEqual(results, {
      getAuthors: Author.all
    }, 'results match');
    test.done();
  });
}

module.exports["flow task callback with error"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor')
  }).execute({
    authorName: 'Dan Brown',
    genreName: '???'
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "this was a test");
    test.done();
  });
}

module.exports["instance task execution"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor')
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      getBooks: [Book.all[6]]
    });
    test.done();
  });  
}

module.exports["prerequisite task execution"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence')
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      assertGenreExistence: true,
      getBooks: [Book.all[6]]
    });
    test.done();
  });
}

module.exports["prerequisite task execution with short circuit error"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence')
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "Genre did not exist");
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Yourmom',
      getAuthor: Author.all[4],
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}

module.exports["prerequisite instance task execution"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence'),
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      assertGenreExistence: true,
      getBooks: [Book.all[6]]
    });
    test.done();
  });  
}

module.exports["prerequisite instance task execution with short circuit error"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence'),
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "Genre did not exist");
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Yourmom',
      getAuthor: Author.all[4],
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}

module.exports["multiple instance parameter"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getById, 'page.chapter.book.genreId'),
  }).execute({
    page: {
      number: 1,
      chapter: {
        number: 2,
        book: Book.all[5]
      }
    }
  }, function(err, results){
    test.deepEqual(results.getGenre, Genre.all[4]);
    test.done();
  });
}

module.exports["result multi instance function"] = function(test){
  new Flow({
    getAuthor: new Task('page.chapter.book.getAuthor'),
  }).execute({
    page: {
      number: 1,
      chapter: {
        number: 2,
        book: Book.all[5]
      }
    }
  }, function(err, results){
    test.deepEqual(results.getAuthor, Author.all[3]);
    test.done();
  });
}

module.exports["instance task execution with result instance parameter"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor.id'),
  }).execute({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      getBooks: [Book.all[6]]
    });
    test.done();
  });  
}

module.exports["multiple asyncronus tasks with prerequisite task execution"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence'),
  }).execute([
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Fantasy'
    }
  ], function(err, results){
    test.ok(!err);
    test.deepEqual(results, [
      { authorName: 'Dan Brown',
        genreName: 'Fiction',
        getAuthor: { id: 4, name: 'Dan Brown' },
        getGenre: { id: 3, name: 'Fiction' },
        assertGenreExistence: true,
        getBooks: [ { id: 6, title: 'Inferno', authorId: 4, genreId: 3 } ] },
      { authorName: 'Patricia Briggs',
        genreName: 'Fantasy',
        getAuthor: { id: 1, name: 'Patricia Briggs' },
        getGenre: Genre.all[1],
        assertGenreExistence: true,
        getBooks: [] }]
    );
    test.done();
  });
}

module.exports["multiple asyncronus tasks with prerequisite task execution (error)"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence'),
  }).execute([
      { authorName: 'Dan Brown',
        genreName: 'Fiction'
      },
      { authorName: 'Patricia Briggs',
        genreName: 'Robot Romance Novels'
      }
  ], function(err, results){
    test.ok(err);
    test.equal(results[0], undefined);
    test.deepEqual(results[1], { 
      authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels',
      getAuthor: { id: 1, name: 'Patricia Briggs' },
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}

module.exports["multiple asyncronus tasks with prerequisite instance task execution"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence'),
  }).execute([
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Fantasy'
    }
  ], function(err, results){
    test.ok(!err);
    test.deepEqual(results, [
      { authorName: 'Dan Brown',
        genreName: 'Fiction',
        getAuthor: { id: 4, name: 'Dan Brown' },
        getGenre: { id: 3, name: 'Fiction' },
        assertGenreExistence: true,
        getBooks: [ { id: 6, title: 'Inferno', authorId: 4, genreId: 3 } ] },
      { authorName: 'Patricia Briggs',
        genreName: 'Fantasy',
        getAuthor: { id: 1, name: 'Patricia Briggs' },
        getGenre: Genre.all[1],
        assertGenreExistence: true,
        getBooks: [] } 
    ]);
    test.done();
  });  
}

module.exports["multiple asyncronus tasks with prerequisite instance task execution (error)"] = function(test){
  new Flow({
    getAuthor: new Task(Author.getByName, 'authorName'),
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooks: new Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence'),
  }).execute([
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels'
    }
  ], function(err, results){
    test.ok(err);
    test.equal(results[0], undefined);
    test.deepEqual(results[1], { 
      authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels',
      getAuthor: { id: 1, name: 'Patricia Briggs' },
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });  
}

module.exports["task name same as instance method"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task('getGenre.getBooks'),
  }).execute({
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooks: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]]
    });
    test.done();
  });
}

module.exports["undefined instance error"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task('getGenre.getBooks'),
  }).execute({
    genreName: 'Fictiony'
  }, function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got proper error");
    test.equals(e.message, 'Not Found: "getGenre" with genreName "Fictiony"')
    test.done();
  });
}

module.exports["undefined instance error 2"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooks: new Task(Book.findByGenreId, 'getGenre.id.undef_value.err'),
  }).execute({
    genreName: 'Fiction'
  }, function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got proper error");
    test.equals(e.message, 'Not Found During Flow: "getGenre.id.undef_value" with genreName "Fiction"')
    test.done();
  });
}

module.exports["function as arg error"] = function(test){
  try {
    new Flow({
      getBook: new Task(Book.getById, Book.getById, 'bookId'),
  }).execute({
      bookId: 1
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "TypeError", "got TypeError");
    test.equals(e.message, 'args must contain only string names of tasks or data.', "error message match")
    test.done();
  }
}

module.exports["unknown symbol error"] = function(test){
  new Flow({
    getBook: new Task(Book.getById, 'bookId'),
    getAuthor: new Task('getBook.notafunction'),
  }).execute({
    bookId: 1
  }, function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got FlowTaskError");
    test.equals(e.message, "Flow error in 'getAuthor': Unknown symbol 'notafunction' must be either the name of a task, the name of data, or the name of a function on 'getBook'", "error message match")
    test.done();
  });
}

module.exports["unknown symbol for first task argument"] = function(test){
  try {
    new Flow({
      getBook: new Task(Book.getById, 'bookId'),
      getAuthor: new Task('notafunction'),
  }).execute({
      bookId: 1
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, 'FlowTaskError')
    test.equals(e.message, "Flow error in 'getAuthor': Unknown string 'notafunction' must be either the name of a task or the name of data", "error message match")
    test.done();
  }
}

module.exports["undefined task argument error"] = function(test){
  try {
    new Flow({
      getBook: new Task(Book.getById, 'bookId'),
      getAuthor: new Task(Book.getAuthorByBookId, 'getBook'),
  }).execute({
      bookId: 1
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, 'Missing argument: fn', "error message match")
    test.done();
  }
}

module.exports["missing task args error"] = function(test){
  try {
    new Flow({
      getBook: new Task(Book.getById, 'bookId'),
      getAuthor: new Task(),
  }).execute({
      bookId: 1
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, "Missing argument: fn", "error message match")
    test.done();
  }
}

module.exports["missing function in task args error"] = function(test){
    new Flow({
      getBook: new Task(Book.getById, 'bookId'),
      getAuthor: new Task('getBook'),
  }).execute({
      bookId: 1
    }, function(e, results){
      test.ok(e, 'got an error'); 
      test.equals(e.name, "FlowTaskError", "got FlowTaskError");
      test.equals(e.message, "Flow error in 'getAuthor': Not a function: getBook", "error message match")
      test.done();
    });
}

module.exports["invalid flow type task"] = function(test){
  try {
    new Flow({
      getBook: new Task(Book.getById, 'bookId'),
      getAuthor: new Task(3),
  }).execute({
      bookId: 1
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "TypeError", "got TypeError");
    test.equals(e.message, "Task fn must be a string or a function", "error message match")
    test.done();
  }
}

module.exports["error in task function"] = function(test){
  new Flow({
    getBook: new Task(Book.getById, 'bookId'),
    getAuthor: new Task(Author.getById),
  }).execute({
    bookId: 1
  }, function(err, results){
    test.ok(err, 'got an error'); 
    test.equals(err.name, "FlowTaskError", "got FlowTaskError");
    test.equals(err.message, "Flow error in 'getAuthor': Error during execution of function.", "error message match")
    test.ok(/TypeError: undefined is not a function/.test(err.stack))
    test.done();
  });
}

module.exports["error in synchronous task function"] = function(test){
  new Flow({
    getBook: new Task(Book.getById, 'bookId'),
    getAuthor: new Fn(Author.getById),
  }).execute({
    bookId: 1
  }, function(err, results){
    test.ok(err, 'got an error'); 
    test.equals(err.name, "FlowTaskError", "got FlowTaskError");
    test.equals(err.message, "Flow error in 'getAuthor': Error during execution of function.", "error message match")
    test.ok(/TypeError: undefined is not a function/.test(err.stack))
    test.done();
  });
}

module.exports["subFlow execution"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task('getBooksByGenre.getAuthor')
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution with context"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task(Author.getById, 'authorId')
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution using subFlow"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task('getBooksByGenre.getAuthor')
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution with prereqs"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getHambly2: new Task(Author.getById, 'getHambly')
    }),
    getHambly: new Task(Author.getByName, 'authorName')
  }).execute({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }]
    });
    test.done();
  });  
}

/*
getAuthors: *getBooksByGenre, t.getBookAuthor, t.getBooksByAuthor, getHambly

*/
module.exports["two nested subflows with prereqs"] = function(test){
  // new Flow({ 
  //   genreName: 'Fantasy',
  //   authorName: 'Barbara Hambly'
  // });
  // flow.tasks.getGenre = new Task(Genre.getByName, 'genreName');
  // flow.tasks.getBooksByGenre = new Task('getGenre.getBooks');
  // var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
  //   subflow.tasks.getBookAuthor = new Task('getBooksByGenre.getAuthor');
  //   subflow.tasks.getBooksByAuthor = new Task(Book.findByAuthorId, 'getBookAuthor');
  //   var subflow2 = subflow.tasks.getManyHamblies = new Flow('getBooksByAuthor');
  //     subflow2.tasks.getHambly2 = new Task(Author.getById, 'getHambly');
  // flow.tasks.getHambly = new Task(Author.getByName, 'authorName');

  // new Flow();
  // flow.tasks = {
  //   getGenre: new Task(Genre.getByName, flow.data.genreName),
  //   getBooksByGenre: new Task(flow.tasks.getGenre.getBooks),
  //   getAuthors: new Flow(flow.tasks.getBooksByGenre, {
  //     getBookAuthor: flow.data.getAuthor,
  //     getBooksByAuthor: new Task(Book.findByAuthorId, flow.tasks.getBookAuthor),
  //     getManyHamblies: new Flow(flow.tasks.getBooksByAuthor, {
  //       getHambly2: new Task(Author.getById, flow.tasks.getHambly)
  //     })
  //   }),
  //   getHambly: new Task(Author.getByName, flow.data.authorName)
  // });
  // flow.execute({ 
  //   genreName: 'Fantasy',
  //   authorName: 'Barbara Hambly'
  // }, function(err, results){

  // });


  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task('getAuthor'),
      getBooksByAuthor: new Task(Book.findByAuthorId, 'getBookAuthor'),
      getManyHamblies: new Flow('getBooksByAuthor', {
        getHambly2: new Task(Author.getById, 'getHambly')
      })
    }),
    getHambly: new Task(Author.getByName, 'authorName')
  }).execute({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getBookAuthor: Author.all[6],
        getBooksByAuthor: [Book.all[7], Book.all[8]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[6],
        getBooksByAuthor: [Book.all[7], Book.all[8]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }]
    });
    test.done();
  });  
}

module.exports["subflow with prereqs and result instance parameter"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getHambly2: new Task(Author.getById, 'getHambly.id')
    }),
    getHambly: new Task(Author.getByName, 'authorName'),
  }).execute({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }]
    });
    test.done();
  });  
}

module.exports["subflow with empty name"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      getBooksByGenre: new Task('getGenre.getBooks'),
        getAuthors: new Flow('', {
        getBookAuthor: new Task('getBooksByGenre.getAuthor')
      })
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, "Missing argument: context_name", "error message match")
    test.done();    
  }  
}

module.exports["subflow with no tasks"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      getBooksByGenre: new Task('getGenre.getBooks'),
      getAuthors: new Flow('getBooksByGenre')
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      console.log(results);
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "Error", "got Error");
    test.equals(e.message, "No tasks given for Flow.", "error message match")
    test.done();    
  }  
}

module.exports["subflow with bad data name"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      getBooksByGenre: new Task('getGenre.getBooks'),
      getAuthors: new Flow('asdf', {
        getBookAuthor: new Task('getBooksByGenre.getAuthor')
      })
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'asdf' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, getBooksByGenre", "error message match")
    test.done();    
  }  
}


module.exports["subflow task with own data name"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      getBooksByGenre: new Task('getGenre.getBooks'),
      getAuthors: new Flow('getAuthors', {
        getBookAuthor: new Task('getBooksByGenre.getAuthor')
      })
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'getAuthors' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, getBooksByGenre", "error message match")
    test.done();    
  }  
}

module.exports["subflow with explicit prereq"] = function(test){
  var flow = new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task(Author.getById, 'authorId')
    }).requires('assertGenreExistence')
  });
  flow.execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(flow.flows.getAuthors._plan.auto_task.slice(0, flow.flows.getAuthors._plan.auto_task.length - 1), ['getBooksByGenre', 'assertGenreExistence'])
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      assertGenreExistence: true,
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subflow in task array with bad data name"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
      getBooksByGenre: new Task('getGenre.getBooks'),
      getAuthors: new Flow('asdf', {
        getBookAuthor: new Task(Author.getById, 'authorId')
      }).requires('assertGenreExistence')
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });  
  } catch(e){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'asdf' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, assertGenreExistence, getBooksByGenre", "error message match")
    test.done();
  }
}

module.exports["subflow in task array with own data name"] = function(test){
  try {
    new Flow({
      getGenre: new Task(Genre.getByName, 'genreName'),
      assertGenreExistence: new Task(Genre.assertExistence, 'getGenre'),
      getBooksByGenre: new Task('getGenre.getBooks'),
      getAuthors: new Flow('getAuthors', {
        getBookAuthor: new Task(Author.getById, 'authorId')
      }).requires('assertGenreExistence')
    }).execute({ 
      genreName: 'Fantasy'
    }, function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });  
  } catch(e){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'getAuthors' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, assertGenreExistence, getBooksByGenre", "error message match")
    test.done();
  }
}

module.exports["single data subflow execution"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Flow('getGenre', {
      getBooksByGenre: new Task(Book.findByGenreId, 'id')
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: {
        getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]]
      }
    });
    test.done();
  });  
}

module.exports["single null data subflow execution"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Flow('getGenre', {      
      getBooksByGenre2: new Task(Book.findByGenreId, 'id')
    })
  }).execute({ 
    genreName: 'Chainsaw slashers'
  }, function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getBooksByGenre': Result of 'getGenre' returned no data. Could not start SubFlow.", "error message match")
    test.done();
  });
}

module.exports["subflow with result instance parameter"] = function(test){
  new Flow({
    getGenre: new Task(Genre.getByName, 'genreName'),
    getBooksByGenre: new Task('getGenre.getBooks'),
    getAuthors: new Flow('getBooksByGenre', {
      getBookAuthor: new Task(Author.getById, 'getBooksByGenre.authorId')
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["synchronous task execution"] = function(test){
  new Flow({
    getBook: new Task(Book.getById, 'id'),
    getAuthor: new Task(Author.getById, 'getBook.authorId'),
    getBookAuthorData: new Fn(us.extend, 'new_object', 'getBook', 'getAuthor')
  }).execute({
    id: 3,
    new_object: {}
  }, function(err, results){
    test.deepEqual({
      id: 3,
      new_object: us.extend({}, Book.all[3], Author.all[1]),
      getBook: Book.all[3],
      getAuthor: Author.all[1],
      getBookAuthorData: us.extend({}, Book.all[3], Author.all[1])
    }, results);
    test.done();
  });
}


