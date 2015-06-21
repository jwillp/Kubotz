package com.brm.Kubotz.Features.KubotzCharacter.Components;


import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Used to Display a health bar for an entities health
 */
public class UIHealthComponent extends EntityComponent {
    public static final String ID = "UI_HEALTH_COMPONENT";


    public UIHealthComponent(XmlReader.Element element){
        super(element);
    }

    public UIHealthComponent(){
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
