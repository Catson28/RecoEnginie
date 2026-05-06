"""
Testes da API ReconEngine — Endpoints HTTP
"""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["api"] == "ok"
    assert r.json()["engine"] == "ReconEngine v1.0.0"


def test_list_runs_empty(client):
    r = client.get("/api/runs")
    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert r.json()["items"] == []


def test_get_run_not_found(client):
    r = client.get("/api/runs/non-existent-run-id")
    assert r.status_code == 404


def test_list_open_items_empty(client):
    r = client.get("/api/open-items")
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_open_items_stats_empty(client):
    r = client.get("/api/open-items/stats")
    assert r.status_code == 200
    assert r.json()["total_open"] == 0


def test_reports_summary_empty(client):
    r = client.get("/api/reports/summary")
    assert r.status_code == 200
    assert r.json()["total_runs"] == 0


def test_reports_trends_empty(client):
    r = client.get("/api/reports/trends")
    assert r.status_code == 200
    assert r.json() == []


def test_resolve_open_items_not_found(client):
    r = client.patch("/api/open-items/resolve", json={
        "item_ids":        [99999],
        "resolver":        "admin@bank.com",
        "resolution_type": "other",
    })
    assert r.status_code == 404


def test_matching_run_not_found(client):
    r = client.get("/api/matching/fake-run-id")
    assert r.status_code == 200   # retorna lista vazia (run não existe)


def test_delete_run_not_found(client):
    r = client.delete("/api/runs/fake-run-id")
    assert r.status_code == 404
