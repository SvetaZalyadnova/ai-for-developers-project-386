package ru.hexlet.calendar.api;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CalendarConfiguration {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
