Para rodar o servidor usa o uvicorn:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Depois acedes em:
- **API:** `http://localhost:8000`
- **Docs:** `http://localhost:8000/docs`
- **Redoc:** `http://localhost:8000/redoc`

O `--reload` faz restart automático quando alteras o código — útil em desenvolvimento.