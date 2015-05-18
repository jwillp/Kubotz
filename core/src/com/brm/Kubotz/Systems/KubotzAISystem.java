package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.AI.KubotzPathFinder;
import com.brm.Kubotz.Components.AI.KubotzAIComponent;
import com.brm.Kubotz.Constants;

/**
 * Use to process AI logic of Kubotz
 */
public class KubotzAISystem extends EntitySystem {


    public KubotzAISystem(EntityManager em) {
        super(em);
    }



    public KubotzPathFinder pathfinder = new KubotzPathFinder();



    @Override
    public void init(){}

    @Override
    public void update(float dt) {

        // UPDATE PATHFINDER (RESCAN MAP) //TODO Maybe not rescan all the time (or yess for bullets)
        this.pathfinder.scanMap(em.getEntitiesWithTag(Constants.ENTITY_TAG_PLATFORM));

        // UPDATE BEHAVIOUR TREES OF KUBOTZ
        for(Entity eAI : em.getEntitiesWithComponent(KubotzAIComponent.ID)){
            KubotzAIComponent aiComp = (KubotzAIComponent) eAI.getComponent(KubotzAIComponent.ID);

            aiComp.behaviourTree.tick();
        }
    }





}
