package com.brm.Kubotz.Component.AI;

import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Component to make a kubotz behave by itself (AI)
 */
public class KubotzAIComponent extends EntityComponent {
    public static final String ID = "KUBOTZ_AI_COMPONENT";

    public Timer reactionTime = new Timer(500); //The time it will take for the AI to execute

    public KubotzAIComponent(){
        reactionTime.start();
    }


}
