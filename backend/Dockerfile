# ==============================================================================
# Stage 1: Build da aplicação com Maven Wrapper e JDK 25
# ==============================================================================
FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /workspace

# Copia arquivos do Maven Wrapper e pom.xml primeiro para aproveitar cache de camadas
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copia o código-fonte e gera o artefato executável
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# ==============================================================================
# Stage 2: Imagem enxuta de execução (Runtime JRE 25)
# ==============================================================================
FROM eclipse-temurin:25-jre-alpine AS runtime

WORKDIR /app

# Cria usuário não-root para execução segura em produção
RUN addgroup -S norte && adduser -S norte -G norte

# Copia apenas o JAR empacotado do estágio de build
COPY --from=build /workspace/target/*.jar app.jar
RUN chown -R norte:norte /app

USER norte

ENV PORT=8080
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar"]
