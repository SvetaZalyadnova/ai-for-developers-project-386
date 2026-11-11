package ru.hexlet.calendar.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {

    @GetMapping({"/booking", "/owner"})
    public String frontendRoutes() {
        return "forward:/index.html";
    }
}