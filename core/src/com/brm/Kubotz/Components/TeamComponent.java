package com.brm.Kubotz.Components;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * A Component to add An entity to a Team
 */
public class TeamComponent extends EntityComponent {

    public static final String ID = "TEAM_COMPONENT";

    private String teamName;


    public TeamComponent(String teamName) {
        this.teamName = teamName;
    }


    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }
}


