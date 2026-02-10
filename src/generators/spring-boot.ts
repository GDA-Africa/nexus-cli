/**
 * NEXUS CLI - Spring Boot Project Generator
 *
 * Generates pom.xml, application.properties, and basic Spring Boot structure.
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';

/**
 * Generate Spring Boot project files (Maven-based)
 */
export function generateSpringBootFiles(config: NexusConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Generate pom.xml (Maven build file)
  files.push(generatePomXml(config));

  // Generate application.properties
  files.push(generateApplicationProperties(config));

  // Generate main Application class
  files.push(generateApplicationClass(config));

  // Generate a sample controller
  files.push(generateSampleController(config));

  // Generate application test
  files.push(generateApplicationTest(config));

  return files;
}

function generatePomXml(config: NexusConfig): GeneratedFile {
  const groupId = 'com.example';
  const artifactId = config.projectName;

  return {
    path: 'pom.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>0.1.0</version>
    <name>${config.displayName}</name>
    <description>${config.displayName} - Spring Boot API</description>
    
    <properties>
        <java.version>21</java.version>
    </properties>
    
    <dependencies>
        <!-- Spring Boot Web Starter -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- Spring Boot DevTools (optional, for hot reload) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        
        <!-- Spring Boot Actuator (health checks, metrics) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <!-- Lombok (optional, reduces boilerplate) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        
        <!-- Spring Boot Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`,
  };
}

function generateApplicationProperties(config: NexusConfig): GeneratedFile {
  return {
    path: 'src/main/resources/application.properties',
    content: `# ${config.displayName} Configuration

# Server Configuration
server.port=8080

# Application Name
spring.application.name=${config.projectName}

# Actuator Configuration
management.endpoints.web.exposure.include=health,info,metrics

# Logging Configuration
logging.level.root=INFO
logging.level.com.example=DEBUG

# TODO: Add your custom configuration here
`,
  };
}

function generateApplicationClass(config: NexusConfig): GeneratedFile {
  const className = toPascalCase(config.projectName) + 'Application';
  const packageName = `com.example.${config.projectName.replace(/-/g, '')}`;

  return {
    path: `src/main/java/${packageName.replace(/\./g, '/')}/${className}.java`,
    content: `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ${config.displayName} - Main Application Class
 * 
 * This is the entry point for your Spring Boot application.
 */
@SpringBootApplication
public class ${className} {
    
    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
}
`,
  };
}

function generateSampleController(config: NexusConfig): GeneratedFile {
  const packageName = `com.example.${config.projectName.replace(/-/g, '')}`;

  return {
    path: `src/main/java/${packageName.replace(/\./g, '/')}/controller/HelloController.java`,
    content: `package ${packageName}.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Sample REST controller demonstrating basic endpoint structure.
 * 
 * Replace this with your actual API endpoints.
 */
@RestController
@RequestMapping("/api")
public class HelloController {
    
    @GetMapping("/hello")
    public Map<String, String> hello() {
        return Map.of(
            "message", "Hello from ${config.displayName}!",
            "status", "ok"
        );
    }
    
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
            "status", "UP",
            "service", "${config.projectName}"
        );
    }
}
`,
  };
}

function generateApplicationTest(config: NexusConfig): GeneratedFile {
  const className = toPascalCase(config.projectName) + 'Application';
  const packageName = `com.example.${config.projectName.replace(/-/g, '')}`;

  return {
    path: `src/test/java/${packageName.replace(/\./g, '/')}/${className}Tests.java`,
    content: `package ${packageName};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Integration tests for ${config.displayName}
 */
@SpringBootTest
class ${className}Tests {
    
    @Test
    void contextLoads() {
        // Verifies that Spring context loads successfully
    }
}
`,
  };
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
