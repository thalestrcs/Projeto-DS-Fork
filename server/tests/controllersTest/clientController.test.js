const { registerClient, getCurrentClient, updateClientTags } = require('../../controllers/clientController');
const { db } = require('../../models/db');
const bcrypt = require('bcrypt');

jest.mock('../../models/db');
jest.mock('bcrypt');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Teste da função getCurrentClient
describe('getCurrentClient controller', () => {
    let req, res;

    beforeEach( () => {
        req = { cookies: { clientId: 123 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(new Error('Erro de db'), null);
        });

        getCurrentClient(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
    });

    it('Deve retornar 404 caso o cliente não seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });

        getCurrentClient(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado.' });
    });

    it('Deve retornar os dados formatados caso o cliente seja encontrado', () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, { id: 123, nome: 'João', sobrenome: 'Pedro', email: 'joao@gmail', tags: 'vegano, leal' });
        });

        getCurrentClient(req, res);

        expect(res.json).toHaveBeenCalledWith({ clientId: 123, nome: 'João', sobrenome: 'Pedro', email: 'joao@gmail', tags: ['vegano', 'leal'] });
    });
});

// Teste da função registerClient
describe('registerClient controller', () => {
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
            callback(null, { email: 'joao@gmail' });
        });

        await registerClient(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Este email ou CPF já está registrado.' });
    });

    it('Retorna 400 se forem informadas menos de 5 tags', async () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });

        req.body = { tags: "vegano" };

        await registerClient(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'É necessário informar no mínimo 5 tags.'});
    });

    it('Retorna 201 caso o cadastro tenha sido feito com sucesso', async () => {
        req.body = { nome: 'João', sobrenome: 'Pedro', cpf: 12345678, telefone: 99999999, email: 'joao@gmail', senha: '123', tags: 'vegano, musica, café, almoço, janta' };

        db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
        });
        bcrypt.hash.mockResolvedValue('senha-falsa');
        db.run.mockImplementation((query, params, callback) => {
            callback(null);
        });

        await registerClient(req, res);

        expect(db.get).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: 'Cadastro salvo com sucesso!' });
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', async () => {
        db.get.mockImplementation((query, params, callback) => {
            callback(new Error('Erro de db'), null);
        });

        await registerClient(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor.' });
    });
});

describe('updateClientTags controller', () => {
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
        req.cookies = { clientId: 123 };

        await updateClientTags(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'É necessário informar no mínimo 5 tags.' });
    });

    it('Retorna 404 caso o cliente não tenha sido encontrado ou as tags não forem alteradas', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { clientId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call({changes: 0}, null);
        });

        await updateClientTags(req, res);

        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado ou tags não foram alteradas.' });
    });

    it('Retorna 200 caso as tags sejam atualizadas com sucesso', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { clientId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call({changes: 1}, null);
        });

        await updateClientTags(req, res);

        expect(db.run).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Tags atualizadas com sucesso!',
      updatedTags: expect.arrayContaining(["vegano", "musica", "café", "almoço", "janta"]),}));
    });

    it('Deve retornar 500 caso aconteça algum erro no banco de dados', async () => {
        req.body = { tags: "vegano, musica, café, almoço, janta" };
        req.cookies = { clientId: 123 };

        db.run.mockImplementation((query, params, callback) => {
            callback.call(null, new Error("Erro de db"));
        });

        await updateClientTags(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor ao atualizar tags.' });
    });
});