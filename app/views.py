"""
HTML view routes for the frontend (login/register/article pages).
These routes only render templates and should remain free of business logic.
"""
from __future__ import annotations
from flask import Blueprint, render_template, redirect

bp = Blueprint("views", __name__, template_folder="templates", static_folder="static")

@bp.route("/")
def index():
    return redirect("/login")

@bp.route("/login", methods=["GET"])
def login():
    return render_template("login.html")

@bp.route("/register", methods=["GET"])
def register():
    return render_template("register.html")

@bp.route("/articles", defaults={"page": 1})
@bp.route("/articles/page/<int:page>")
def dashboard(page: int):
    return render_template("dashboard.html")

@bp.route("/articles/create")
def create():
    return render_template("create.html")

@bp.route("/articles/edit/<slug>")
def edit(slug: str):
    return render_template("edit.html", slug=slug)
