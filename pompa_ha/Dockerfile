ARG BUILD_FROM
FROM $BUILD_FROM
# Tylko biblioteka standardowa Pythona: nic nie pobieramy przy budowaniu.
COPY app /app
CMD [ "python3", "-u", "/app/main.py" ]
