package com.brm.Kubotz.Features.GameRules;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

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

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}


