const { login, logout } = require('../../controllers/authController');
const { db } = require('../../models/db');
const bcrypt = require('bcrypt');

jest.mock('../../models/db');
jest.mock('bcrypt');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('login controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { email: 'teste@restaurante.com', password: '123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  it('Deve realizar login como cliente com sucesso', async () => {
    db.get
      .mockImplementationOnce((query, params, callback) => {
        callback(null, null); // Nenhum restaurante encontrado
      })
      .mockImplementationOnce((query, params, callback) => {
        callback(null, { id: '2', email: 'teste@restaurante.com', senha: 'senha-falsa' });
      });
    bcrypt.compare.mockResolvedValue(true);

    await login(req, res);

    expect(db.get).toHaveBeenCalledTimes(2);
    expect(db.get).toHaveBeenCalledWith(
      'SELECT * FROM restaurants WHERE email = ?',
      ['teste@restaurante.com'],
      expect.any(Function)
    );
    expect(db.get).toHaveBeenCalledWith(
      'SELECT * FROM clients WHERE email = ?',
      ['teste@restaurante.com'],
      expect.any(Function)
    );
    expect(bcrypt.compare).toHaveBeenCalledWith('123', 'senha-falsa');
    expect(res.cookie).toHaveBeenCalledWith('clientId', '2', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login realizado com sucesso!',
      userType: 'client',
      redirect: '/client_dashboard.html'
    });
  });

  it('Deve realizar login como restaurante com sucesso', async () => {
    db.get.mockImplementation((query, params, callback) => {
        callback(null, { id: '2', email: 'teste@restaurante.com', senha: 'senha-falsa' }); 
    });
    bcrypt.compare.mockResolvedValue(true);

    await login(req, res);

    expect(db.get).toHaveBeenCalled();
    expect(db.get).toHaveBeenCalledWith(
      'SELECT * FROM restaurants WHERE email = ?',
      ['teste@restaurante.com'],
      expect.any(Function)
    );
    expect(bcrypt.compare).toHaveBeenCalledWith('123', 'senha-falsa');
    expect(res.cookie).toHaveBeenCalledWith('restaurantId', '2', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login realizado com sucesso!',
      userType: 'restaurant',
      redirect: '/dashboard.html'
    });
  });

  it('Deve retornar 401 se o email ou senha forem incorretos', async () => {
    db.get
      .mockImplementationOnce((query, params, callback) => {
        callback(null, null); // Nenhum restaurante encontrado
      })
      .mockImplementationOnce((query, params, callback) => {
        callback(null, null); // Nenhum cliente encontrado
      });

    await login(req, res);

    expect(db.get).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email ou senha incorretos.' });
  });

  it('Deve retornar 500 em caso de erro de banco de dados', async () => {
    db.get.mockImplementation((query, params, callback) => {
        callback(new Error("Erro de db"), null); 
    });

    await login(req, res);

    expect(db.get).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
  });

  it('Deve retornar 500 em caso de erro de banco de dados', async () => {
    db.get
      .mockImplementationOnce((query, params, callback) => {
        callback(null, null); // Nenhum restaurante encontrado
      })
      .mockImplementationOnce((query, params, callback) => {
        callback(new Error("Erro de db"), null);
      });

    await login(req, res);

    expect(db.get).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
  });
});