## Edit User:
1. get encrypted password:
    ```
    docker exec -it st-docker-app-1 npm run hash-password -- <yourpassword>
    ```
2. execute sql in pgAdmin:

    - For Admin User:
        ```
        UPDATE profiles
        SET password = '<generated_password>'
        username = '<new_username>'
        WHERE id = '254611ba-b706-44bb-9107-592ce58280ae';
        ```
    - For Assistant User:
        ```
        UPDATE profiles
        SET password = '<generated_password>'
            username = '<new_username>'
        WHERE id = '78404f03-c2ac-4653-8e72-2d5383635a9f';
        ```

Setup Project:

1. Copy .env.example to .env and replace placeholders marked with <...>
    - Generate a 256 bit jwt secret. For example on https://jwtsecrets.com/

2. Start Container
    ```
    docker-compose up --build -d
    ```
    - App on localhost:3000
    - DB on localhost:5432
    - PgAdmin on localhost:5050