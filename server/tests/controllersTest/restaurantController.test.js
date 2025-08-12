const { registerRestaurant, getCurrentRestaurant, getRestaurants, getRestaurantTags, updateRestaurantTags, getMe } = require('../../controllers/restaurantController');
const { db } = require('../../models/db');
const bcrypt = require('bcrypt');

jest.mock('../../models/db');
jest.mock('bcrypt');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('registerRestaurant controller', () => {
    let req, res;

    beforeEach( () => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('Retorna 400 se o email e senha já estiverem registrados', async () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, { email: 'teste@restaurante.com' });
        });

        await registerRestaurant(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Este email já está registrado.' });
    });

    it('Retorna 400 se forem informadas menos de 5 tags', async () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });

        req.body = { tags: "vegano" };

        await registerRestaurant(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'É necessário informar no mínimo 5 tags.' });
    });

    it('Retorna 201 caso o cadastro tenha sido feito com sucesso', async () => {
        req.body = { restaurantName: 'Restaurante Teste',
        cnpj: '12345678000195',
        email: 'teste@restaurante.com',
        password: '123',
        tags: 'vegano, italiano, café, almoço, janta'
       };

        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });
        bcrypt.hash.mockResolvedValue('senha-falsa');
        db.run.mockImplementation((query, params, callback) => {
            callback(null);
        });

        await registerRestaurant(req, res);

        expect(db.get).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: 'Restaurante registrado com sucesso!' });
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', async () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(new Error('Erro de db'), null);
        });

        await registerRestaurant(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor ao registrar restaurante.' });
    });
});

describe('getCurrentRestaurant controller', () => {
    let req, res;

    beforeEach( () => {
        req = { cookies: { restaurantId: 123 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(new Error('Erro de db'), null);
        });

        getCurrentRestaurant(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
    });

    it('Deve retornar 404 caso o restaurante não seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });

        getCurrentRestaurant(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante não encontrado.' });
    });

    it('Deve retornar os dados formatados caso o restaurante seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, { id: '1', restaurant_name: 'Restaurante Teste', email: 'testerestaurante@email.com', telefone: 80028922, tags: 'vegano, italiano' });
        });

        getCurrentRestaurant(req, res);

        expect(res.json).toHaveBeenCalledWith({ restaurantId: '1', restaurantName: 'Restaurante Teste', restaurantEmail: 'testerestaurante@email.com', restaurantPhone: 80028922, tags: ['vegano', 'italiano'] });
    });
});

describe('getRestaurants controller', () => {
  let req, res;

  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('Deve retornar 500 em caso de erro no banco de dados', () => {
    db.all.mockImplementation((query, params, callback) => {
      callback(new Error('Erro de db'), null);
    });

    getRestaurants(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
  });

  it('Deve retornar restaurantes com média de avaliações', () => {
    req.query.limit = '2';
    db.all.mockImplementation((query, params, callback) => {
      callback(null, [
        { id: '1', restaurant_name: 'Restaurante A', average_rating: 4.5, review_count: 10 },
        { id: '2', restaurant_name: 'Restaurante B', average_rating: 3.8, review_count: 5 }
      ]);
    });

    getRestaurants(req, res);

    expect(db.all).toHaveBeenCalledWith(
      expect.any(String),
      [2],
      expect.any(Function)
    );
    expect(res.json).toHaveBeenCalledWith({
      restaurants: [
        { id: '1', restaurant_name: 'Restaurante A', average_rating: 4.5, review_count: 10 },
        { id: '2', restaurant_name: 'Restaurante B', average_rating: 3.8, review_count: 5 }
      ]
    });
  });
});

describe('getRestaurantTags controller', () => {
  let req, res;

  beforeEach(() => {
    req = { query: { id: '1' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('Deve retornar 500 em caso de erro no banco de dados', () => {
    db.get.mockImplementation((query, params, callback) => {
      callback(new Error('Erro de db'), null);
    });

    getRestaurantTags(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
  });

  it('Deve retornar 404 se o restaurante não for encontrado', () => {
    db.get.mockImplementation((query, params, callback) => {
      callback(null, null);
    });

    getRestaurantTags(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante não encontrado.' });
  });

  it('Deve retornar as tags do restaurante', () => {
    db.get.mockImplementation((query, params, callback) => {
      callback(null, { tags: 'vegano, italiano' });
    });

    getRestaurantTags(req, res);

    expect(res.json).toHaveBeenCalledWith({ tags: ['vegano', 'italiano'] });
  });
});

describe('updateRestaurantTags controller', () => {
    let req, res;

    beforeEach( () => {
        req = { body: {}, cookies: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('Retorna 400 se forem informadas menos de 5 tags', async () => {
        req.body = {tags: "vegano" };
        req.cookies = { restaurantId: 123 };

        await updateRestaurantTags(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'É necessário informar no mínimo 5 tags.' });
    });

    it('Retorna 404 caso o restaurante não tenha sido encontrado ou as tags não forem alteradas', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { restaurantId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call({changes: 0}, null);
        });

        await updateRestaurantTags(req, res);

        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante não encontrado ou tags não foram alteradas.' });
    });

    it('Retorna 200 caso as tags sejam atualizadas com sucesso', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { restaurantId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call({changes: 1}, null);
        });

        await updateRestaurantTags(req, res);

        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Tags atualizadas com sucesso!',
      updatedTags: expect.arrayContaining(["vegano", "musica", "café", "almoço", "janta"]),}));
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { restaurantId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call(null, new Error("Erro de db"));
        });

        await updateRestaurantTags(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor ao atualizar tags.' });
    });
});

describe('getMe controller', () => {
    let req, res;

    beforeEach( () => {
        req = { cookies: { restaurantId: 123 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(new Error('Erro de db'), null);
        });

        getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
    });

    it('Deve retornar 404 caso o restaurante não seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });

        getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante não encontrado.' });
    });

    it('Deve retornar os dados formatados caso o restaurante seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, { id: '1', restaurant_name: 'Restaurante Teste', email: 'testerestaurante@email.com', telefone: 80028922, tags: 'vegano, italiano', averageRating: 5, reviewCount: 10 });
        });

        getMe(req, res);

        expect(res.json).toHaveBeenCalledWith({ restaurantId: '1', restaurantName: 'Restaurante Teste', restaurantEmail: 'testerestaurante@email.com', restaurantPhone: 80028922, tags: ['vegano', 'italiano'], averageRating: 5.0, reviewCount: 10 });
    });
});