# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-21

### Added
- Turborepo monorepo with a NestJS server, a React and Vite web app, and a shared interfaces package
- Pre-buy checklist engine with ten rules: seven hard gates for token safety and limits, plus scored organic-activity and social checks
- Server health endpoint and a web status page that polls it
- Railway infrastructure config for the server and web services, with the web app on kestrel.sidedevelopments.com
- GitHub Actions workflow that builds and tests on every push and pull request
